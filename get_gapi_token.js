document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sign-in').addEventListener('click', signIn)
  document.getElementById('sign-out').addEventListener('click', signOut)
  gapi.load('client:auth2', initGoogleAPI)
})

function initGoogleAPI() {
  gapi.client.init({
    clientId: '535713324276-4dufi4pmkts4vl0ufvfo0vigqan6jcsv.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  }).then(() => {
    const authInstance = gapi.auth2.getAuthInstance()
    const signedIn = authInstance.isSignedIn.get()
    // authInstance.isSignedIn.listen(requestSubscriptionData)
    if (!signedIn) {
      document.getElementById('status').innerText = "Currently signed out."
    } else {
      requestSubscriptionData([])
    }
  })
}

function signIn() {
  gapi.auth2.getAuthInstance().signIn()
}

function signOut() {
  gapi.auth2.getAuthInstance().signOut()
}

function requestSubscriptionData(subscriptions, nextPageToken) {
  gapi.client.request({
    method: 'GET',
    path: '/youtube/v3/subscriptions',
    params: {
      mine: true,
      part: 'snippet',
      maxResults: 50,
      pageToken: nextPageToken || '',
    },
  }).execute((res) => onSubscriptionData(res, subscriptions))
}

function onSubscriptionData(response, subscriptions) {
  console.log("got a page!")
  let subs = subscriptions.concat(response.items)
  if (response.nextPageToken) {
    requestSubscriptionData(subs, response.nextPageToken)
  } else {
    generateRSSFeeds(subs)
  }
}

function generateRSSFeeds(subscriptions) {
  let baseXML = "https://www.youtube.com/feeds/videos.xml?channel_id="
  let baseHTML = "https://www.youtube.com/channel/"

  function subscriptionEntry(sub) {
    let id = sub.snippet.resourceId.channelId
    let title = sub.snippet.title
    return [
      '<outline',
      `text="${title}"`,
      `title="${title}"`,
      'type="rss"',
      `xmlUrl="${baseXML + id}"`,
      `htmlUrl="${baseHTML + id}"`,
      '/>',
    ].join(' ')
  }

  let xml =
`<opml version="1.0">
  <head>
    <title>RSS feeds from YouTube Subscriptions</title>
  </head>
  <body>
    <outline text="YouTube Subscriptions" title="YouTube Subscriptions">
${subscriptions.map(s => '      ' + subscriptionEntry(s)).join('\n')}
    </outline>
  </body>
</opml>`

  document.getElementById('opml').innerText = xml
  let link = document.getElementById('download')
  link.href= 'data:text/xml;charset=utf8,' + encodeURI(xml)
  link.target = '_blank'
  link.download = 'YouTube Subscriptions.xml'
}
