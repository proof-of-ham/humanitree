import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock pool information for WLD/USDC
    const poolInfo = {
      pair: 'WLD/USDC',
      liquidity: {
        wld: 1250000, // 1.25M WLD
        usdc: 3125000, // 3.125M USDC
        total: 4375000, // Total liquidity in USD
      },
      volume: {
        '24h': 125000, // 24h volume in USD
        '7d': 875000,  // 7d volume in USD
        '30d': 3750000, // 30d volume in USD
      },
      fees: {
        swap: 0.003, // 0.3% swap fee
        protocol: 0.0005, // 0.05% protocol fee
        lp: 0.0025, // 0.25% LP fee
      },
      price: {
        wld: 2.5, // 1 WLD = 2.5 USDC
        usdc: 0.4, // 1 USDC = 0.4 WLD
      },
      change: {
        '1h': 0.02, // +2% in last hour
        '24h': -0.05, // -5% in last 24h
        '7d': 0.15, // +15% in last 7 days
      },
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(poolInfo)
  } catch (error) {
    console.error('Pool info error:', error)
    return NextResponse.json(
      { error: 'Failed to get pool information' },
      { status: 500 }
    )
  }
} 