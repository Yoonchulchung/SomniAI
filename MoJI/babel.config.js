/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 1. Worklets Core (이건 필수!)
    ['react-native-worklets-core/plugin'],

    // ❌ 삭제하세요! (이 줄 때문에 에러가 나는 겁니다)
    // ['vision-camera-resize-plugin/plugin'], 

    // 2. Reanimated (항상 마지막)
    [
      'react-native-reanimated/plugin',
      {
        processNestedWorklets: true
      }
    ],
  ],
}