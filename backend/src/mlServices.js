const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

async function callMLService(payload) {
    const response = await fetch(`${ML_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(`ML error: ${response.status}`)
    }

    return await response.json()
}

export default callMLService