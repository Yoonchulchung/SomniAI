watchman watch-del-all || true
sudo rm -rf node_modules android/.gradle android/.cxx \
       android/app/build android/app/.cxx ~/.gradle

npm install

cd android && ./gradlew clean

npx react-native run-android
