const API_BASE = "http://127.0.0.1:5000";

async function request(path, options = {}) {
    // 发送 HTTP 请求
    let response;

    try {
        response = await fetch(API_BASE + path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch (error) {
        throw new Error("无法连接后端服务器，请检查网络或后端状态");
    }

    // 解析后端返回的 JSON
    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error("后端返回的数据不是有效的 JSON");
    }

    // 判断请求是否成功
    if (!response.ok || result.success === false) {
        throw new Error(
            result.error?.message || "请求失败"
        );
    }

    // 只返回业务数据
    return result.data;
}


function get(path){
    return request(path, {method: "GET"});
}

function post(path, data){
    return request(path, {method: "POST", body: JSON.stringify(data)});
}

function put(path, data){
    return request(path, {method: "PUT", body: JSON.stringify(data)});
}

export {request, get, post, put};