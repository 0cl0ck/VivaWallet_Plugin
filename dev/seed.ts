import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
  }

  // Initialize Viva Settings global if it doesn't exist
  try {
    const vivaSettings = await payload.findGlobal({
      slug: 'viva-settings',
    })

    // findGlobal can return an empty object if the global exists but has no values.
    // We check for a property that should exist if it's seeded.
    if (!vivaSettings || !vivaSettings.environment) {
      await payload.updateGlobal({
        slug: 'viva-settings',
        data: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          environment: 'demo',
          sourceCode: '0000',
        },
      })
    }
  } catch {
    // This case handles if the global doesn't exist at all, triggering an error.
    await payload.updateGlobal({
      slug: 'viva-settings',
      data: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        environment: 'demo',
        sourceCode: '0000',
      },
    })
  }
}
