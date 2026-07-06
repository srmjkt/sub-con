import { prisma } from '@/lib/prisma'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function handleFileUpload(
  file: File,
  moduleName: string,
  recordId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'File type not allowed' }
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File too large (max 10MB)' }
  }

  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const { v4: uuidv4 } = await import('uuid')

  // Generate unique filename
  const ext = path.extname(file.name) || '.bin'
  const uniqueName = `${uuidv4()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', moduleName)
  const filePath = `/uploads/${moduleName}/${uniqueName}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, uniqueName), buffer)
  } catch (writeError) {
    console.error('Failed to save file:', writeError)
    return { success: false, error: 'Failed to save file' }
  }

  // Save to database using generic Attachment model
  await prisma.attachment.create({
    data: {
      recordId,
      module: moduleName,
      fileName: file.name,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedById: userId,
    },
  })

  return { success: true }
}

export async function parseFormData(request: Request): Promise<{
  fields: Record<string, string | null>
  file: File | null
  customFieldsData: Record<string, string> | null
}> {
  const formData = await request.formData()
  const fields: Record<string, string | null> = {}
  let file: File | null = null
  let customFieldsData: Record<string, string> | null = null

  for (const [key, value] of formData.entries()) {
    if (key === 'file' && value instanceof File) {
      file = value
    } else if (key === 'customFieldsData' && typeof value === 'string') {
      try {
        customFieldsData = JSON.parse(value)
      } catch {
        // Ignore parse errors
      }
    } else if (typeof value === 'string') {
      fields[key] = value
    }
  }

  return { fields, file, customFieldsData }
}