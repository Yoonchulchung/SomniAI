cmake_minimum_required(VERSION 3.22)        # RN 0.71+ 
project(MoJI_Test)

set(OUT_NAME "Run_MoJI_Test")

get_filename_component(PROJECT_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../" ABSOLUTE)
set(MOJI_CPP_ROOT        "${PROJECT_ROOT}/MoJI/cpp")
set(NODE_MODULES_DIR     "${PROJECT_ROOT}/MoJI/node_modules")

find_package(CURL REQUIRED)

add_executable(${OUT_NAME}
        "main.cpp"
        "${MOJI_CPP_ROOT}/send-http.cpp"
        )

target_include_directories(${OUT_NAME} PUBLIC
    "${MOJI_CPP_ROOT}"
)

target_link_libraries(Run_MoJI_Test PRIVATE CURL::libcurl)
