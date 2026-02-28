#!/bin/bash
# Build and install debug APK
cd "$(dirname "$0")"
bash gradlew installDebug
