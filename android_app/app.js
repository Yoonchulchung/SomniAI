import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet, Text, Image } from 'react-native';
import { Camera } from 'expo-camera';
import axios from 'axios';

export default function App() {
    const [hasPermission, setHasPermission] = useState(null);
    const cameraRef = useRef(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const sendFrame = async () => {
        try {
            const photo = await cameraRef.current.takePictureAsync(
                {
                    quality: 0.5,
                    base64: true,
                    skipProcessing: true,
                }
            );
        
            const imageBytes = ArrayBuffer.from(photo.base64, 'base64');

            await axios.post('http://localhost:8000/predict', imageBytes, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
            });
            console.log('Frame sent successfully');
        } catch (error){
            console.error('Error sending frame:', error);
            alert.alert('Error sending frame. Please try again.');
        } finally {
            setIsSending(false);
        }
    };
}