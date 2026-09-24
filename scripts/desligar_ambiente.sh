#!/bin/bash
# Desliga o ambiente BIA na AWS para economizar fora do horário de estudo.
#
# Ordem: services ECS -> Auto Scaling Group -> RDS -> bia-dev
#   - Services primeiro: as tasks saem do ALB de forma limpa antes das
#     instâncias sumirem.
#   - Não adianta dar stop nas instâncias do cluster: o Auto Scaling Group
#     recria. Por isso zeramos o grupo (min/max/desired = 0).
#
# Continuam ligados (não têm "stop"): ALB, CloudFront, Route53, ECR.
# Para religar: scripts/ligar_ambiente.sh
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER="cluster-bia-alb"
SERVICES="service-bia-alb service-bia-alb-dev"
DB="bia"
DEV_NAME="bia-dev"

# Descobre o Auto Scaling Group pelo capacity provider do cluster, em vez de
# fixar o nome gerado pelo console (muda se o cluster for recriado).
CP=$(aws ecs describe-clusters --clusters "$CLUSTER" \
  --query 'clusters[0].defaultCapacityProviderStrategy[0].capacityProvider' --output text)
ASG_ARN=$(aws ecs describe-capacity-providers --capacity-providers "$CP" \
  --query 'capacityProviders[0].autoScalingGroupProvider.autoScalingGroupArn' --output text)
ASG="${ASG_ARN##*/}"

echo "Vai DESLIGAR:"
echo "  services : $SERVICES (cluster $CLUSTER)"
echo "  ASG      : $ASG"
echo "  RDS      : $DB"
echo "  EC2      : $DEV_NAME"
echo "A aplicação em produção fica fora do ar até rodar ligar_ambiente.sh."
read -r -p "Confirma? (s/N) " resp
[ "$resp" = "s" ] || { echo "Cancelado."; exit 0; }

echo "==> [1/4] Zerando os services ECS"
for svc in $SERVICES; do
  aws ecs update-service --cluster "$CLUSTER" --service "$svc" --desired-count 0 \
    --query 'service.serviceName' --output text
done
echo "    aguardando as tasks pararem..."
aws ecs wait services-stable --cluster "$CLUSTER" --services $SERVICES

echo "==> [2/4] Zerando o Auto Scaling Group"
aws autoscaling update-auto-scaling-group --auto-scaling-group-name "$ASG" \
  --min-size 0 --max-size 0 --desired-capacity 0

echo "==> [3/4] Parando o RDS"
status=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].DBInstanceStatus' --output text)
if [ "$status" = "available" ]; then
  aws rds stop-db-instance --db-instance-identifier "$DB" \
    --query 'DBInstance.DBInstanceStatus' --output text
else
  echo "    RDS está '$status', nada a fazer"
fi

echo "==> [4/4] Parando a $DEV_NAME"
instance_id=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$DEV_NAME" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$instance_id" ]; then
  aws ec2 stop-instances --instance-ids $instance_id \
    --query 'StoppingInstances[].CurrentState.Name' --output text
else
  echo "    $DEV_NAME já está parada"
fi

echo
echo "Ambiente desligado."
echo "ATENÇÃO: a AWS religa o RDS sozinha depois de 7 dias parado."
