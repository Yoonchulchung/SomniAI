FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel
WORKDIR /home/

################## Install Dependencies ####################
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git screen libgl1 libglib2.0-0 libgl1-mesa-glx ffmpeg libturbojpeg --fix-missing && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install mmcv 2.2.0
RUN pip install --no-cache-dir -U openmim && \
    pip install --no-cache-dir mmcv==2.2.0 -f https://download.openmmlab.com/mmcv/dist/cu121/torch2.1/index.html && \
    mim install "mmdet==3.2.0" && \
    pip cache purge

RUN pip install openmim
RUN mim install mmengine "mmcv<2.2.0"


ENV PYTHONPATH "${PYTHONPATH}:/app/AI"
ENV LANG ko_KR.UTF-8

RUN git clone https://github.com/open-mmlab/mmpose.git /mmpose
WORKDIR /mmpose
RUN git checkout main
ENV FORCE_CUDA="1"
RUN pip install -r requirements/build.txt
RUN pip install --no-cache-dir -e .

RUN cd .. && rm -rf ./mmpose
WORKDIR /home
