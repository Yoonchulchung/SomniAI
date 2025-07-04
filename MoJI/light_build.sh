sudo rm -rf node_modules
npm install

cd android && ./gradlew clean

npx react-native run-android
