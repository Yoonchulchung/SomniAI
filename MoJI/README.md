<div align="center">
<h1>MoJI Application</h1>
</div>

This React Native application, developed for the Smart Pillow Project, monitors user presence in real-time. To ensure high performance, camera frames from react-native-vision-camera are processed efficiently by a C++ layer using JSI (JavaScript Interface) before the data is transmitted to an AI server for analysis.

![Image](./MoJI.png)


# Getting Started
React Native : 0.75.4  
react-native-vision-camera : 4.6.4  
react-native-worklets-core : 1.6.0  

## Install Dependecies and Build

Due to GitHub's upload size limitations, the dependencies for this project ahve been removed. We created a simple and convenient bash script. By simply running the command below, you can automatically build curl for android and then build the MoJI app for use.
### Android
```
./build.sh
```

We don't support IOS.

### C++ Implementation
You can check out the C++ source files responsible for the high-speed streaming and processing logic in the directory below or click [here](./android/app/src/main/cpp/)

__./android/app/src/main/cpp/__

Before building the project, you must first compile __curl__ and __OpenSSL__ for the Android runtime. Check out our [build](./curl/).      
