
window.StarMatePet = {
    currentState: "idle",

    setState: function (name) {
        this.currentState = name;

        console.log("伙伴当前状态：", name);
    }
};
