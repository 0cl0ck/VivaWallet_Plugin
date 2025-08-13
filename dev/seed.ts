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
    
    if (!vivaSettings) {
      await payload.updateGlobal({
        slug: 'viva-settings',
        data: {
          environment: 'demo',
          sourceCode: '0000',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
      })
    }
  } catch (error) {
    // Global might not exist yet, create it
    await payload.updateGlobal({
      slug: 'viva-settings',
      data: {
        environment: 'demo',
        sourceCode: '0000',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      },
    })
  }
}
