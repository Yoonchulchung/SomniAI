cmake_minimum_required(VERSION 3.22)        # RN 0.71+ 
project(MoJI_Test)
set(OUT_NAME "Run_MoJI_Test")
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_BUILD_TYPE Release)

get_filename_component(PROJECT_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../" ABSOLUTE)
get_filename_component(OUTPUT_DIR "${CMAKE_BINARY_DIR}/../" ABSOLUTE)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${OUTPUT_DIR})

message(" ")
message(STATUS "=====================================")
message(STATUS "Building MoJI Test Executable file")
message(STATUS "current compile dir: ${CMAKE_CURRENT_SOURCE_DIR}")
message(STATUS "compile root dir:    ${CMAKE_SOURCE_DIR}")
message(STATUS "project root dir:    ${PROJECT_ROOT}")
message(STATUS "build output dir:    ${CMAKE_BINARY_DIR}")
message(STATUS "executable dir:      ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}")
message(STATUS "compiler:            ${CMAKE_CXX_COMPILER}")
message(STATUS "os info:             ${CMAKE_SYSTEM_NAME}")
message(STATUS "=====================================")
message(" ")

set(MOJI_CPP_ROOT        "${PROJECT_ROOT}/MoJI/cpp")
set(NODE_MODULES_DIR     "${PROJECT_ROOT}/MoJI/node_modules")

find_package(CURL REQUIRED)
message(STATUS "Found CURL: ${CURL_VERSION_STRING}")

add_executable(${OUT_NAME}
        "main.cpp"
        "${MOJI_CPP_ROOT}/send-http.cpp"
        )

target_include_directories(${OUT_NAME} PRIVATE
    "${MOJI_CPP_ROOT}"
)

target_link_libraries(Run_MoJI_Test PRIVATE CURL::libcurl)
