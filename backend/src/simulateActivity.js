const BASE_URL = 'http://127.0.0.1:5003/api'

async function request(path, { token, ...options } = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.message || ''}`)
    return body
}

/**
 * Optional smoke scenario. It deliberately captures identifiers returned by the
 * API and never assumes a fixed global_id or local_id.
 */
export async function simulateActivity() {
    console.log('\n=== Dynamic credit-flow smoke scenario ===')
    const suffix = Date.now().toString(36)
    const password = process.env.CLIENT_PASSWORD || '12345678'
    const registration = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            username: `demo-${suffix}`,
            password,
            email: `demo-${suffix}@example.local`,
            inn: '7700000001',
            companyName: 'ООО «Вектор»',
        }),
    })
    const employee = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'employee', password: process.env.EMPLOYEE_PASSWORD }),
    })
    const submitted = await request('/applications', {
        method: 'POST',
        token: registration.token,
        body: JSON.stringify({
            loan_id: 1,
            loan_sum: 500000,
            loan_duration: 12,
            purpose: 'WORKING_CAPITAL',
        }),
    })

    const employeeCard = await request(`/bank/applications/${submitted.global_id}`, { token: employee.token })
    let status = employeeCard.application.status
    if (status === 'NEED_MORE_INFO') {
        const clarified = await request(`/applications/${submitted.local_id}/clarify`, {
            method: 'POST',
            token: registration.token,
            body: JSON.stringify({ bki_data: { monthly_payment: 0 } }),
        })
        status = clarified.data.status
    }
    if (status === 'APPROVED' || status === 'COUNTEROFFER') {
        const accepted = await request(`/applications/${submitted.local_id}/accept`, {
            method: 'POST', token: registration.token,
        })
        status = accepted.status
    }
    console.log(`Smoke scenario completed: global_id=${submitted.global_id}, status=${status}`)
}
