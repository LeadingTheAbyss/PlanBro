import prisma from '@/lib/prisma';

export async function trackApiCall(endpointName: string) {
  try {
    const storeName = 'api_metrics';
    
    // Fetch the existing metrics
    const appState = await prisma.appState.findUnique({
      where: { storeName }
    });

    let metrics: Record<string, number> = {};
    if (appState && appState.stateJson) {
      try {
        metrics = JSON.parse(appState.stateJson);
      } catch (e) {
        metrics = {};
      }
    }

    // Increment
    metrics[endpointName] = (metrics[endpointName] || 0) + 1;

    // Upsert back
    await prisma.appState.upsert({
      where: { storeName },
      update: { stateJson: JSON.stringify(metrics) },
      create: { storeName, stateJson: JSON.stringify(metrics) }
    });

  } catch (error) {
    console.error(`Failed to track API call for ${endpointName}:`, error);
    // Silent fail so we don't break the actual API response
  }
}
