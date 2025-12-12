# SomniAI

SomniAI helps improve your sleep quality by analyzing your sleep posture and movements, delivering personalized feedback that helps you wake up refreshed and ready to take on the day.
With higher-quality sleep, you can wake up feeling refreshed and energized to start your day.
Camera data collected through the mobile app is transmitted to a FastAPI server, where an AI model processes and analyzes the information in real time.

## MoJI
MoJI is an application that captures your sleep posture through a camera and sends the data to a server for movement analysis, helping guide you toward better sleep posture. 

For deeper description how we made MoJI app, please read [MoJI Documents](./MoJI/README.md).

## System Architecture
[Mobile App (MoJI)] ---> [AI Server] ---> [Sleep Feedback (HW)]

We made AI Server using FastAPI. Please check out [here](./app/README.md)

## Installation
In order to use SomniAI, Please follow below instruction to install.    

__1. Download Dataset (Optional)__   
In oder to test SomniAI, you can download dataset via [kaggle - IEEE VIP CUP 2021 Dataset](https://www.kaggle.com/datasets/awsaf49/ieee-vip-cup-2021-train-val-dataset) or below bash api.
```bash
kaggle datasets download awsaf49/ieee-vip-cup-2021-train-val-dataset
```
Or use our Python script:
```bash
python data/download_data.py --path /path/to/dataset
```

__2. Run FastAPI Server__   
``` bash
./deploy_private.sh
```

__3. Run Nest.js and Next.js Web Server__
``` bash
./deploy_public.sh
```

## Usage
You can test the server with sample data using:
```bash
python tests/test.py 
```

## Train
You can train ViTPose with IEEE 2021 VIP CUP Dataset using:
```bash
./mmpose/run_train.sh
```

## License
MIT License

## Contact
Yoonchul005@gmail.com

Our implemnation is mainly based on the following codebases. We gratefully thank the authors for their wonderfull works.  

[MMPose](https://github.com/open-mmlab/mmpose)   
[ViTPose](https://github.com/ViTAE-Transformer/ViTPose/tree/main)       
[react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)        
[react-native-fast-opencv](https://github.com/lukaszkurantdev/react-native-fast-opencv)     
[docker-android](https://github.com/react-native-community/docker-android)      
