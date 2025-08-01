PYTHONPATH="$(dirname $0)/..":$PYTHONPATH \
    torchrun \
    --nnodes=1 --node_rank=0 --master_addr=127.0.0.1 --nproc_per_node=2 --master_port=56789 \
    $(dirname "$0")/tools/train.py $(dirname "$0")/configs/vitpose/vitpose_b.py \
    --launcher pytorch ${@:4} --work-dir ./work_dirs/somniai_vipcup2021_$(TZ=Asia/Seoul date +%Y-%m-%d_%H-%M-%S) \
    --amp
