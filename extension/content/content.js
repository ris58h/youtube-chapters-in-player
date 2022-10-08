let chapters = null

main()

onLocationHrefChange(() => {
    removeChaptersElement()
    main()
})

function main() {
    const videoId = getVideoId()
    if (!videoId) {
        return
    }
    fetchChapters(videoId)
        .then(cs => {
            if (videoId !== getVideoId()) {
                return
            }
            chapters = cs
        })
}

document.addEventListener('click', e => {
    console.log("DEBUG: click");
    const chapterButton = e.target.closest('.ytp-chapter-container')
    if (chapterButton) {
        if (!chapters || chapters.length === 0) {
            console.log("DEBUG: no chapters");
            return
        }
        getOrCreateChaptersElement()
        toggleChaptersElementVisibility()
        e.stopImmediatePropagation()
    } else {
        hideChaptersElement()
    }
}, true)

function getChaptersElement() {
    return document.querySelector('.__youtube-chapters-in-player')
}

function getOrCreateChaptersElement() {
    let chaptersElement = getChaptersElement()
    if (!chaptersElement) {
        console.log("DEBUG: create chapters element")
        const container = document.querySelector('#movie_player')
        chaptersElement = document.createElement('div')
        chaptersElement.classList.add('__youtube-chapters-in-player')
        chaptersElement.classList.add('ytp-popup')
        chaptersElement.style.display = 'none'
        container.appendChild(chaptersElement)

        const panelElement = document.createElement('div')
        panelElement.classList.add('ytp-panel')
        chaptersElement.appendChild(panelElement)

        const menuElement = document.createElement('div')
        menuElement.classList.add('ytp-panel-menu')
        panelElement.appendChild(menuElement)

        for (const chapter of chapters) {
            menuElement.appendChild(toChapterElement(chapter))
        }

        const chapterIndex = getCurrentChapterIndex()
        markChapterAtIndexAsCurrent(chapterIndex)
    }

    let currentChapterIndex = null
    const video = document.querySelector('video')
    video.addEventListener('timeupdate', () => {
        const chapterIndex = getCurrentChapterIndex()
        if (currentChapterIndex !== chapterIndex) {
            console.log("DEBUG: new chapter index is " + chapterIndex)
            currentChapterIndex = chapterIndex
            markChapterAtIndexAsCurrent(currentChapterIndex)
        }
    })

    return chaptersElement
}

function toChapterElement(chapter) {
    const itemElement = document.createElement('div')
    itemElement.classList.add('ytp-menuitem')
    itemElement.addEventListener('click', e => {
        const video = document.querySelector('video')
        video.currentTime = chapter.time
        hideChaptersElement()
    })

    const iconElement = document.createElement('div')
    iconElement.classList.add('ytp-menuitem-icon')
    itemElement.appendChild(iconElement)

    const labelElement = document.createElement('div')
    labelElement.classList.add('ytp-menuitem-label')
    labelElement.textContent = chapter.text
    itemElement.appendChild(labelElement)

    const contentElement = document.createElement('div')
    contentElement.classList.add('ytp-menuitem-content')
    contentElement.textContent = chapter.timestamp
    itemElement.appendChild(contentElement)

    return itemElement
}

function getCurrentChapterIndex() {
    const currentTime = document.querySelector('video').currentTime
    return getChapterIndex(chapters, currentTime)
}

function getChapterIndex(chapters, time) {
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (time >= chapters[i].time) {
            return i
        }
    }
    return -1
}

function markChapterAtIndexAsCurrent(chapterIndex) {
    console.log("DEBUG: markChapterAsCurrent " + chapterIndex);
    const chaptersElement = getChaptersElement()
    if (!chaptersElement) {
        return
    }
    const menuItems = chaptersElement.querySelectorAll('.ytp-menuitem')
    for (let i = 0; i < menuItems.length; i++) {
        const menuItem = menuItems[i]
        if (i === chapterIndex) {
            menuItem.setAttribute('aria-checked', 'true')
        } else {
            menuItem.removeAttribute('aria-checked')
        }
    }
}

function removeChaptersElement() {
    console.log("DEBUG: removeChaptersElement");
    let chaptersElement = document.querySelector('.__youtube-chapters-in-player')
    if (chaptersElement) {
        chaptersElement.remove()
    }
}

function toggleChaptersElementVisibility() {
    if (isChaptersElementVisible()) {
        hideChaptersElement()
    } else {
        showChaptersElement()
        adjustChaptersElementSize()
    }
}

function isChaptersElementVisible() {
    const chaptersElement = getChaptersElement()
    return chaptersElement && !chaptersElement.style.display
}

function showChaptersElement() {
    const chaptersElement = getChaptersElement()
    if (chaptersElement) {
        chaptersElement.style.display = ''
    }
}

function hideChaptersElement() {
    const chaptersElement = getChaptersElement()
    if (chaptersElement) {
        chaptersElement.style.display = 'none'
    }
}

function adjustChaptersElementSize() {
    const chaptersElement = getChaptersElement()
    if (!chaptersElement) {
        return
    }
    const menu = chaptersElement.querySelector('.ytp-panel-menu')
    const menuHeight = menu.clientHeight
    const maxHeight = document.querySelector('#movie_player').clientHeight * 0.9
    chaptersElement.style.height = Math.min(menuHeight, maxHeight) + 'px'
}

function fetchChapters(videoId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'fetchChapters', videoId }, resolve)
    })
}

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function parseParams(href) {
    const noHash = href.split('#')[0]
    const paramString = noHash.split('?')[1]
    const params = {}
    if (paramString) {
        const paramsArray = paramString.split('&')
        for (const kv of paramsArray) {
            const tmparr = kv.split('=')
            params[tmparr[0]] = tmparr[1]
        }
    }
    return params
}

function onLocationHrefChange(callback) {
    let currentHref = document.location.href
    const observer = new MutationObserver(() => {
        if (currentHref != document.location.href) {
            currentHref = document.location.href
            callback()
        }
    })
    observer.observe(document.querySelector("body"), { childList: true, subtree: true })
}
