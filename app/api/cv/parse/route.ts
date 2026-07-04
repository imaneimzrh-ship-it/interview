import { NextRequest, NextResponse } from 'next/server'

// This route now only handles TXT/MD — PDF parsing happens client-side via pdfjs-dist.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      return NextResponse.json({ error: 'PDF parsing is handled client-side.' }, { status: 400 })
    }
    if (ext !== 'txt' && ext !== 'md') {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, TXT, or MD.' }, { status: 400 })
    }

    const buf  = Buffer.from(await file.arrayBuffer())
    let text   = buf.toString('utf-8')
    text = text.replace(/\s+/g, ' ').trim().slice(0, 9000)
    if (text.length < 50) return NextResponse.json({ error: 'Could not extract text from file.' }, { status: 422 })

    return NextResponse.json({ text })
  } catch (e: any) {
    console.error('[cv/parse]', e)
    return NextResponse.json({ error: 'Failed to parse file.' }, { status: 500 })
  }
}
