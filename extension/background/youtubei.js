const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

export async function fetchChapters(videoId) {
    const videoResponse = await fetchVideo(videoId)
    return chaptersFromVideoResponse(videoResponse)
}

function chaptersFromVideoResponse(videoResponse) {
    const result = videoResponse.find(e => e.response).response
        .engagementPanels.find(e => e.engagementPanelSectionListRenderer && e.engagementPanelSectionListRenderer.panelIdentifier === 'engagement-panel-macro-markers-description-chapters')
        ?.engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents
        .map(content => macroMarkersListItemRendererToChapter(content.macroMarkersListItemRenderer))
    return result ? result : []
}

function macroMarkersListItemRendererToChapter(renderer) {
    const text = renderer.title.simpleText
    const timestamp = renderer.timeDescription.simpleText
    const time = parseTimestamp(timestamp)
    return {
        text,
        timestamp,
        time
    }
}

async function fetchVideo(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
        credentials: "omit",
        headers: {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
        }
    })
    return await response.json()
}

function parseTimestamp(ts) {
    const parts = ts.split(':').reverse()
    const secs = parseInt(parts[0])
    if (secs > 59) {
        return null
    }
    const mins = parseInt(parts[1])
    if (mins > 59) {
        return null
    }
    const hours = parseInt(parts[2]) || 0
    return secs + (60 * mins) + (60 * 60 * hours)
}
