chrome.runtime.onInstalled.addListener(()=>{
    chrome.storage.sync.get(["geminiApiKey"],(key)=>{
        if(!key.geminiApiKey){
            chrome.tabs.create({url:"options.html"})
        }
    })
})