main()

onLocationHrefChange(() => {
    removeChaptersControls()
    main()
})

function main() {
    const videoId = getVideoId()
    if (!videoId) {
        return
    }
    fetchChapters(videoId)
        .then(chapters => {
            if (videoId !== getVideoId()) {
                return
            }
            if (chapters && chapters.length > 0) {
                createChaptersControls(chapters)
            }
        })
}

document.addEventListener('click', e => {
    const buttons = e.target.closest('#__youtube-chapters-in-player__buttons__menu')
    if (buttons) {
        toggleChaptersMenuVisibility()
    } else {
        hideChaptersMenu()
    }
}, true)

let timeupdateListener = null

function createChaptersControls(chapters) {
    createChaptersButtons(chapters)
    createChaptersMenu(chapters)

    let currentChapterIndex = null
    timeupdateListener = () => {
        const chapterIndex = getCurrentChapterIndex(chapters)
        if (currentChapterIndex !== chapterIndex) {
            currentChapterIndex = chapterIndex
            selectChaptersMenuItemAtIndex(currentChapterIndex)
            setChaptersMenuButtonText(chapters[currentChapterIndex]?.title)
        }
    }
    getVideo().addEventListener('timeupdate', timeupdateListener)
}

function removeChaptersControls() {
    removeChaptersButtons()
    removeChaptersMenu()

    if (timeupdateListener) {
        const video = getVideo()
        if (video) {
            video.removeEventListener('timeupdate', timeupdateListener)
        }
        timeupdateListener = null
    }
}

function getChaptersButtons() {
    return document.querySelector('#__youtube-chapters-in-player__buttons')
}

function createChaptersButtons(chapters) {
    const chaptersButtons = document.createElement('div')
    chaptersButtons.id = '__youtube-chapters-in-player__buttons'
    chaptersButtons.classList.add('ytp-chapter-container')
    document.querySelector('#movie_player .ytp-left-controls').appendChild(chaptersButtons)

    const dot = document.createElement('span')
    dot.classList.add('ytp-chapter-title-prefix')
    dot.setAttribute('aria-hidden', 'true')
    dot.textContent = '•'
    chaptersButtons.appendChild(dot)

    const menuButton = document.createElement('button')
    menuButton.id = '__youtube-chapters-in-player__buttons__menu'
    menuButton.classList.add('ytp-button')
    // menuButton.setAttribute('aria-controls', '__youtube-chapters-in-player__menu')
    // menuButton.setAttribute('aria-expanded', 'false')
    // menuButton.setAttribute('aria-haspopup', 'true')
    chaptersButtons.appendChild(menuButton)
    setChaptersMenuButtonText(chapters[getCurrentChapterIndex(chapters)]?.title)
}

function setChaptersMenuButtonText(text) {
    let chaptersMenuButton = document.querySelector('#__youtube-chapters-in-player__buttons__menu')
    if (chaptersMenuButton) {
        chaptersMenuButton.textContent = text ? text : 'Chapters'
    }
}

function removeChaptersButtons() {
    let chaptersButtons = getChaptersButtons()
    if (chaptersButtons) {
        chaptersButtons.remove()
    }
}

function getChaptersMenu() {
    return document.querySelector('#__youtube-chapters-in-player__menu')
}

function createChaptersMenu(chapters) {
    const chaptersMenu = document.createElement('div')
    chaptersMenu.id = '__youtube-chapters-in-player__menu'
    chaptersMenu.classList.add('ytp-popup')
    chaptersMenu.style.display = 'none'
    document.querySelector('#movie_player').appendChild(chaptersMenu)

    const panelElement = document.createElement('div')
    panelElement.classList.add('ytp-panel')
    chaptersMenu.appendChild(panelElement)

    const menuElement = document.createElement('div')
    menuElement.classList.add('ytp-panel-menu')
    panelElement.appendChild(menuElement)

    for (const chapter of chapters) {
        menuElement.appendChild(toChapterElement(chapter))
    }

    const chapterIndex = getCurrentChapterIndex(chapters)
    selectChaptersMenuItemAtIndex(chapterIndex)
}

function toChapterElement(chapter) {
    const itemElement = document.createElement('div')
    itemElement.classList.add('ytp-menuitem')
    itemElement.addEventListener('click', e => {
        getVideo().currentTime = chapter.time
        hideChaptersMenu()
    })

    const iconElement = document.createElement('div')
    iconElement.classList.add('ytp-menuitem-icon')
    itemElement.appendChild(iconElement)

    const labelElement = document.createElement('div')
    labelElement.classList.add('ytp-menuitem-label')
    labelElement.textContent = chapter.title
    itemElement.appendChild(labelElement)

    const contentElement = document.createElement('div')
    contentElement.classList.add('ytp-menuitem-content')
    contentElement.textContent = chapter.timestamp
    itemElement.appendChild(contentElement)

    return itemElement
}

function selectChaptersMenuItemAtIndex(chapterIndex) {
    const chaptersMenu = getChaptersMenu()
    if (!chaptersMenu) {
        return
    }
    const menuItems = chaptersMenu.querySelectorAll('.ytp-menuitem')
    for (let i = 0; i < menuItems.length; i++) {
        const menuItem = menuItems[i]
        if (i === chapterIndex) {
            menuItem.setAttribute('aria-checked', 'true')
        } else {
            menuItem.removeAttribute('aria-checked')
        }
    }
}

function removeChaptersMenu() {
    let chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.remove()
    }
}

function toggleChaptersMenuVisibility() {
    if (isChaptersMenuVisible()) {
        hideChaptersMenu()
    } else {
        showChaptersMenu()
        adjustChaptersMenuSize()
    }
}

function isChaptersMenuVisible() {
    const chaptersMenu = getChaptersMenu()
    return chaptersMenu && !chaptersMenu.style.display
}

function showChaptersMenu() {
    const chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.style.display = ''
    }
}

function hideChaptersMenu() {
    const chaptersMenu = getChaptersMenu()
    if (chaptersMenu) {
        chaptersMenu.style.display = 'none'
    }
}

function adjustChaptersMenuSize() {
    const chaptersMenu = getChaptersMenu()
    if (!chaptersMenu) {
        return
    }
    const menu = chaptersMenu.querySelector('.ytp-panel-menu')
    const menuHeight = menu.clientHeight
    const maxHeight = document.querySelector('#movie_player').clientHeight * 0.9
    chaptersMenu.style.height = Math.min(menuHeight, maxHeight) + 'px'
}

function getVideo() {
    return document.querySelector('#movie_player video')
}

function getCurrentChapterIndex(chapters) {
    const currentTime = getVideo().currentTime
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
