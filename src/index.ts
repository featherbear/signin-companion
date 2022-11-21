import __fetch from 'node-fetch'
import type { RequestInit } from 'node-fetch'

const BASE = "https://backend.signinapp.com";
const UA = "Mozilla/5.0 (Linux; Android 10; SM-G965F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36 sign-in-app-companion/2.4.8"

type Location = { accuracy: number, lat: number, lng: number }

/**
 * Google Maps - Satellite View, do it.
 */
const defaultLocation: Location = {
    "accuracy": 50,
    "lat": -27.96792277746221,
    "lng": 153.4190704952657
}

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

/**
 * Request a long expiration (1-year) token
 * 
 * @param code Connect Code
 * @returns Token Response
 */
export async function connect(code: string): Promise<{ status: boolean, token?: string }> {
    let fetch = _fetch
    return fetch("/api/mobile/connect", {
        method: "POST",
        body: {
            "code": code.replace(/-/g, '')
        }
    }).then(j => j.json())
}

/**
 * Provides site functions
 */
export function withToken(token: string) {
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

    /**
     * Get new access token
     */
    async function reconnect() {
        return fetch("/api/mobile/reconnect", {
            headers: authHeader
        })
    }

    /**
     * Perform a sign-in  
     * 
     * @param siteId You'll probably have to intercept your network requests to find this
     * @param location 
     */
    async function signIn(siteId: number, location?: Location) {
        return fetch("/api/mobile/sign-in", {
            method: "POST",
            headers: authHeader,
            body: {
                "method": "sign-in",
                "siteId": siteId,
                "location": location ?? defaultLocation,
                "messages": [],
                "personalFields": [],
                "additional": []
            }
        })
    }

    /**
     * Perform a sign-out  
     * @param location 
     */
    async function signOut(location?: Location) {
        return fetch("/api/mobile/sign-out", {
            method: "POST",
            headers: authHeader,
            body: {
                location: location ?? defaultLocation,
                "additional": []
            }
        })
    };

    return { connect, reconnect, signIn, signOut }
}

