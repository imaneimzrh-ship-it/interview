import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

// Handles TXT, MD (utf-8 read) and DOCX (mammoth extraction).
// PDF is parsed client-side via pdfjs-dist and never reaches this route.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'pdf') {
      return NextResponse.json({ error: 'Please hard-refresh the page (Cmd+Shift+R) and try uploading again.' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: buf })
      text = result.value
    } else if (ext === 'txt' || ext === 'md') {
      text = buf.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, TXT, or MD.' }, { status: 400 })
    }

    text = text.replace(/\s+/g, ' ').trim().slice(0, 9000)
    if (text.length < 50) return NextResponse.json({ error: 'Could not extract text from file. Try pasting your CV directly.' }, { status: 422 })

    return NextResponse.json({ text })
  } catch (e: any) {
    console.error('[cv/parse]', e)
    return NextResponse.json({ error: 'Failed to parse file.' }, { status: 500 })
  }
}
