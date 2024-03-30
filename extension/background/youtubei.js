// Youtubei API declines requests with wrong Origin.
// We need to remove the Origin header which is added automatically by the browser.
chrome.permissions.contains({
    permissions: ['webRequestBlocking'],
    origins: ['https://www.youtube.com/']
}, (permissionExists) => {
    // In Chrome/Chromium (Manifest V3) Origin is removed via declarative net request.
    // See `declarative_net_request` property in the manifest.
    if (!permissionExists) {
        return
    }

    // In Firefox (Manifest V2) we have to remove Origin manually.
    chrome.webRequest.onBeforeSendHeaders.addListener(
        details => {
            const newRequestHeaders = details.requestHeaders.filter(header => {
                return header.name.toLowerCase() !== "origin"
            })
            return {requestHeaders: newRequestHeaders}
        },
        {urls: ["https://www.youtube.com/*"]},
        ["blocking", "requestHeaders", chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
    )
})

const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

const engagementPanelIds = [
    'engagement-panel-macro-markers-description-chapters',
    'engagement-panel-macro-markers-auto-chapters'
]

export function chaptersFromVideoResponse(videoResponse) {
    const response = Array.isArray(videoResponse)
        ? videoResponse.find(e => e.response).response
        : videoResponse.response
    const result = response
        .engagementPanels.find(e => e.engagementPanelSectionListRenderer && engagementPanelIds.includes(e.engagementPanelSectionListRenderer.panelIdentifier))
        ?.engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents
        .map(content => content.macroMarkersListItemRenderer ? macroMarkersListItemRendererToChapter(content.macroMarkersListItemRenderer) : null)
        .filter(e => e ? true : false)
    return result ? result : []
}

function macroMarkersListItemRendererToChapter(renderer) {
    const title = renderer.title.simpleText
    const timestamp = renderer.timeDescription.simpleText
    const time = parseTimestamp(timestamp)
    return {
        title,
        timestamp,
        time
    }
}

export async function fetchVideo(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
        credentials: "omit",
        headers: {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
        }
    })
    return await response.json()
}

export function parseTimestamp(ts) {
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

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
const INNERTUBE_CLIENT_NAME = "WEB"

export async function fetchComments(videoResponse) {
    const token = commentsContinuationToken(videoResponse)
    if (!token) {
        return []
    }
    const commentsResponse = await fetchNext(token)

    const items = commentsResponse.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems
    if (!items) {
        return []
    }

    const comments = []

    for (const item of items) {
        if (item.commentThreadRenderer) {
            const cr = item.commentThreadRenderer.comment.commentRenderer
            const isPinned = cr.pinnedCommentBadge;
            const text = cr.contentText.runs
                .map(run => run.text)
                .join("")
            comments.push({ text, isPinned })
        }
    }

    return comments
}

function commentsContinuationToken(videoResponse) {
    const response = Array.isArray(videoResponse)
        ? videoResponse.find(e => e.response).response
        : videoResponse.response
    return response
        .contents.twoColumnWatchNextResults.results.results
        .contents.find(e => e.itemSectionRenderer && e.itemSectionRenderer.sectionIdentifier === 'comment-item-section').itemSectionRenderer
        .contents[0].continuationItemRenderer // When comments are disabled there is messageRenderer instead.
        ?.continuationEndpoint.continuationCommand.token
}

async function fetchNext(continuation) {
    const body = {
        context: {
            client: {
                clientName: INNERTUBE_CLIENT_NAME,
                clientVersion: INNERTUBE_CLIENT_VERSION
            }
        },
        continuation
    }
    const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${INNERTUBE_API_KEY}`, {
        method: "POST",
        credentials: "omit",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })

    return await response.json()
}

