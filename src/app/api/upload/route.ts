import { NextRequest, NextResponse } from 'next/server'
import { parseAndProcessLog } from '../utils/parseLog'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const text = await file.text()
  const parsedData = parseAndProcessLog(text)
  return NextResponse.json(parsedData)
}
