import { connect, withToken } from './src'

async function run() {
    let TOKEN = "<token>"
    const fn = withToken(TOKEN)
    await fn.signIn(1234)
    // console.log(await fn.signOut());
}

run()