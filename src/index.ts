import __fetch from 'node-fetch'
import type { RequestInit } from 'node-fetch'

const BASE = "https://backend.signinapp.com";
const UA = "Mozilla/5.0 (Linux; Android 10; SM-G965F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36 sign-in-app-companion/2.4.8"


type Location = { accuracy: number, lat: number, lng: number }

function _fetch(path: string, opts?: Omit<RequestInit, 'body'> & { body?: any }) {

    let headers = {
        'Content-Type': 'application/json'
    }

    if (opts?.body) {
        opts.body = JSON.stringify(opts.body)
    }

    return __fetch(BASE + path, {
        ...opts,
        headers: {
            ...headers,
            ...opts?.headers,
            'User-Agent': UA,
            'X-Requested-With': 'com.signingapp.companion'
        },
    })
}

async function connect(code: string): Promise<{ status: boolean, token?: string }> {
    let fetch = _fetch
    return fetch("/api/mobile/connect", {
        method: "POST",
        body: {
            "code": code.replace(/-/g, '')
        }
    }).then(j => j.json())
}

function withToken(token: string) {
    let authHeader = {
        Authorization: 'Bearer ' + token,
    }

    let fetch = (...args: Parameters<typeof _fetch>) => _fetch(...args).then(j => {
        if (j.headers.get('x-ratelimit-limit')) {
            if (j.headers.get('x-ratelimit-remaining') == "0") {
                throw new Error("Rate limit reached")
            } else {
                console.debug("Remain: " + j.headers.get('x-ratelimit-remaining'));
            }
        }

        return j.json()
    })
    // var fetch = fetch

    // connect('MRYB-LVXR-JLLB')

    async function reconnect() {
        return fetch("/api/mobile/reconnect", {
            headers: authHeader
        })
    }

    async function signIn(siteId?: number, location?: Location) {
        return fetch("/api/mobile/sign-in", {
            method: "POST",
            headers: authHeader,
            body: {
                "method": "sign-in",
                "siteId": siteId ?? 6413,
                "location": location ?? {
                    "accuracy": 12.4,
                    "lat": -33.8847457,
                    "lng": 151.2102816
                },
                "messages": [],
                "personalFields": [],
                "additional": []
            }
        })
    }

    async function signOut(location?: Location) {
        return fetch("/api/mobile/sign-out", {
            method: "POST",
            headers: authHeader,
            body: {
                location: location ?? {
                    "accuracy": 13.9,
                    "lat": -33.8847956,
                    "lng": 151.2103165
                },
                "additional": []
            }
        })
    };

    return { connect, reconnect, signIn, signOut }
}

; (async function () {
    let TOKEN = "..."
    const fn = withToken(TOKEN)
    await fn.signIn()
    console.log(await fn.signOut());

})();
