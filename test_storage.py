from services.storage import load_json, save_json

companion = load_json("companion.json", {})

print("读取到的伙伴信息：")
print(companion)

companion["name"] = "测试伙伴"

save_json("companion.json", companion)

print("保存完成！")

new_companion = load_json("companion.json", {})

print("重新读取的信息：")
print(new_companion)
