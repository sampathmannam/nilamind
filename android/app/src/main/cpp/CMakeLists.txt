cmake_minimum_required(VERSION 3.10)
project(llama-gpu-jni)

set(CMAKE_CXX_STANDARD 17)

# llama.cpp headers (upstream, no LM_ prefix)
set(LLAMA_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/include)

add_library(llama-gpu-jni SHARED
    llama-gpu-jni.cpp
)

target_include_directories(llama-gpu-jni PRIVATE
    ${LLAMA_INCLUDE_DIR}
)

# Link against the pre-built Vulkan-enabled .so files
target_link_directories(llama-gpu-jni PRIVATE
    ${CMAKE_SOURCE_DIR}/../jniLibs/arm64-v8a
)

target_link_libraries(llama-gpu-jni
    llama
    ggml
    ggml-base
    ggml-vulkan
    ggml-cpu
    log
    android
    vulkan
)

set_target_properties(llama-gpu-jni PROPERTIES
    OUTPUT_NAME "llama-gpu-jni"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../jniLibs/arm64-v8a"
)
