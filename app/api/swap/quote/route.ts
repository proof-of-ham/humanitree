import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const amount = searchParams.get('amount')

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to, amount' },
        { status: 400 }
      )
    }

    if (from !== 'WLD' || to !== 'USDC') {
      return NextResponse.json(
        { error: 'Only WLD to USDC conversion is supported' },
        { status: 400 }
      )
    }

    const wldAmount = parseFloat(amount)
    if (isNaN(wldAmount) || wldAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Mock exchange rate (in real implementation, this would come from a DEX or price feed)
    const wldToUsdcRate = 2.5 // 1 WLD = 2.5 USDC (mock rate)
    const usdcAmount = wldAmount * wldToUsdcRate

    // Mock swap quote with fees and slippage
    const quote = {
      from: 'WLD',
      to: 'USDC',
      fromAmount: wldAmount,
      toAmount: usdcAmount,
      rate: wldToUsdcRate,
      usdcAmount: usdcAmount.toFixed(2),
      fee: 0.003, // 0.3% fee
      feeAmount: (wldAmount * 0.003).toFixed(4),
      slippage: 0.005, // 0.5% slippage
      estimatedGas: '0.001', // ETH gas estimate
      validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Swap quote error:', error)
    return NextResponse.json(
      { error: 'Failed to get swap quote' },
      { status: 500 }
    )
  }
} 