import * as youtubei from './youtubei.js'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'fetchChapters') {
        fetchChapters(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        return true
    }
})

async function fetchChapters(videoId) {
    return await youtubei.fetchChapters(videoId)
}
