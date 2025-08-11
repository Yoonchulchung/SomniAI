<div align="center">
<h1>MoJI Application</h1>
</div>

This React Native application, developed for the Smart Pillow Project, monitors user presence in real-time. To ensure high performance, camera frames from react-native-vision-camera are processed efficiently by a C++ layer using JSI (JavaScript Interface) before the data is transmitted to an AI server for analysis.

![Image](./MoJI.png)


# Getting Started
React Native : 0.75.4  
react-native-vision-camera : 4.6.4  
react-native-worklets-core : 1.6.0  

## Step 1: Install Dependecies

Due to GitHub's upload size limitations, the dependencies for this project ahve been removed. Please make sure to install them before running the project.
```
npm install
```
## Step 2: Start Metro

First, you will need to run Metro, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:
```
# Using npm
npm start

# OR using Yarn
yarn start
```
## Step 3: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:
### Android
```
# Using npx
npx react-native run-android

# OR using Yarn
yarn android
```

We don't support IOS.

### C++ Implementation
You can check out the C++ source files responsible for the high-speed streaming and processing logic in the directory below or click [here](./android/app/src/main/cpp/)

__./android/app/src/main/cpp/__

Before building the project, you must first compile __curl__ and __OpenSSL__ for the Android runtime. Check out our [build](./curl/)