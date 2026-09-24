#!/bin/bash
# Religa o ambiente BIA desligado por scripts/desligar_ambiente.sh.
#
# O container roda as migrations no boot (ver Dockerfile), então as tasks
# só podem subir com o RDS disponível. Para ganhar tempo, RDS, ASG e bia-dev
# são ligados juntos, e só os services esperam o banco e as instâncias.
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER="cluster-bia-alb"
SERVICES="service-bia-alb service-bia-alb-dev"
DB="bia"
DEV_NAME="bia-dev"
INSTANCIAS=2   # tamanho do ASG (min/max/desired)
TASKS=2        # desired count de cada service

# Mesmo esquema do desligar: acha o ASG pelo capacity provider do cluster.
CP=$(aws ecs describe-clusters --clusters "$CLUSTER" \
  --query 'clusters[0].defaultCapacityProviderStrategy[0].capacityProvider' --output text)
ASG_ARN=$(aws ecs describe-capacity-providers --capacity-providers "$CP" \
  --query 'capacityProviders[0].autoScalingGroupProvider.autoScalingGroupArn' --output text)
ASG="${ASG_ARN##*/}"

echo "==> [1/5] Ligando o RDS"
status=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].DBInstanceStatus' --output text)
if [ "$status" = "stopped" ]; then
  aws rds start-db-instance --db-instance-identifier "$DB" \
    --query 'DBInstance.DBInstanceStatus' --output text
else
  echo "    RDS está '$status', nada a fazer"
fi

echo "==> [2/5] Subindo o Auto Scaling Group para $INSTANCIAS instâncias"
aws autoscaling update-auto-scaling-group --auto-scaling-group-name "$ASG" \
  --min-size "$INSTANCIAS" --max-size "$INSTANCIAS" --desired-capacity "$INSTANCIAS"

echo "==> [3/5] Ligando a $DEV_NAME"
instance_id=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$DEV_NAME" "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$instance_id" ]; then
  aws ec2 start-instances --instance-ids $instance_id \
    --query 'StartingInstances[].CurrentState.Name' --output text
else
  echo "    $DEV_NAME não está parada, nada a fazer"
fi

echo "==> [4/5] Aguardando RDS e instâncias do cluster"
echo "    RDS (costuma levar 5 a 10 min)..."
aws rds wait db-instance-available --db-instance-identifier "$DB"
echo "    RDS disponível"
echo "    instâncias registrando no cluster..."
for _ in $(seq 1 40); do   # até ~10 min
  n=$(aws ecs describe-clusters --clusters "$CLUSTER" \
    --query 'clusters[0].registeredContainerInstancesCount' --output text)
  [ "$n" -ge "$INSTANCIAS" ] && break
  sleep 15
done
echo "    $n de $INSTANCIAS instâncias registradas"
if [ "$n" -lt "$INSTANCIAS" ]; then
  echo "ERRO: as instâncias não registraram no cluster a tempo. Confira o ASG no console."
  exit 1
fi

echo "==> [5/5] Subindo os services ECS"
for svc in $SERVICES; do
  aws ecs update-service --cluster "$CLUSTER" --service "$svc" --desired-count "$TASKS" \
    --query 'service.serviceName' --output text
done
echo "    aguardando as tasks ficarem saudáveis..."
aws ecs wait services-stable --cluster "$CLUSTER" --services $SERVICES

echo
echo "Ambiente ligado: https://formacaoaws.openxtec.com.br"
