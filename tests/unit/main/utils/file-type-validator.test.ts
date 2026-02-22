import {
  validateTextFile,
  validateTextFiles,
  getFileExtension,
  getAllTextExtensions,
  getRejectedExtensions,
  isTextFileExtension,
  getFileTypeCategory,
  getSupportedFileTypesDescription,
  getRejectedFileTypesDescription
} from '../../../../src/main/utils/file-type-validator'

describe('file-type-validator', () => {
  describe('validateTextFile', () => {
    describe('should accept text files', () => {
      test('plain text files', () => {
        const result = validateTextFile('document.txt')
        expect(result.isValid).toBe(true)
        expect(result.fileType).toBe('text')
        expect(result.extension).toBe('.txt')
      })

      test('markdown files', () => {
        const result = validateTextFile('README.md')
        expect(result.isValid).toBe(true)
        expect(result.fileType).toBe('text')
      })

      test('JavaScript files', () => {
        const validFiles = ['script.js', 'component.jsx', 'module.mjs']
        validFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(true)
          expect(result.fileType).toBe('text')
        })
      })

      test('TypeScript files', () => {
        const validFiles = ['app.ts', 'component.tsx']
        validFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(true)
        })
      })

      test('web files', () => {
        const validFiles = ['index.html', 'styles.css', 'app.scss']
        validFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(true)
        })
      })

      test('config files', () => {
        const validFiles = ['config.json', 'app.yaml', 'settings.toml', '.env']
        validFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(true)
        })
      })

      test('programming language files', () => {
        const validFiles = ['main.py', 'App.java', 'program.cpp', 'app.go', 'lib.rs']
        validFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(true)
        })
      })
    })

    describe('should reject image files', () => {
      test('common image formats', () => {
        const imageFiles = ['photo.jpg', 'icon.png', 'logo.svg', 'image.gif', 'pic.webp']
        imageFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(false)
          expect(result.fileType).toBe('image')
          expect(result.reason).toContain('Image files')
        })
      })
    })

    describe('should reject video files', () => {
      test('common video formats', () => {
        const videoFiles = ['movie.mp4', 'clip.avi', 'video.mov', 'stream.webm', 'film.mkv']
        videoFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(false)
          expect(result.fileType).toBe('video')
          expect(result.reason).toContain('Video files')
        })
      })
    })

    describe('should reject audio files', () => {
      test('common audio formats', () => {
        const audioFiles = ['song.mp3', 'audio.wav', 'music.ogg', 'track.flac', 'voice.m4a']
        audioFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(false)
          expect(result.fileType).toBe('audio')
          expect(result.reason).toContain('Audio files')
        })
      })
    })

    describe('should reject binary files', () => {
      test('common binary formats', () => {
        const binaryFiles = [
          'document.pdf',
          'report.docx',
          'data.xlsx',
          'archive.zip',
          'app.exe'
        ]
        binaryFiles.forEach((file) => {
          const result = validateTextFile(file)
          expect(result.isValid).toBe(false)
          expect(result.fileType).toBe('binary')
          expect(result.reason).toContain('Binary files')
        })
      })
    })

    describe('should reject unknown file types', () => {
      test('unknown extension', () => {
        const result = validateTextFile('file.xyz')
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain('Unknown file type')
      })
    })

    describe('should handle files without extensions', () => {
      test('no extension', () => {
        const result = validateTextFile('file-without-extension')
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain('no extension')
      })
    })
  })

  describe('validateTextFiles', () => {
    test('should separate valid and invalid files', () => {
      const files = [
        'document.txt',
        'script.js',
        'photo.jpg',
        'config.json',
        'video.mp4',
        'README.md'
      ]

      const result = validateTextFiles(files)

      expect(result.validFiles).toHaveLength(4)
      expect(result.validFiles).toContain('document.txt')
      expect(result.validFiles).toContain('script.js')
      expect(result.validFiles).toContain('config.json')
      expect(result.validFiles).toContain('README.md')

      expect(result.invalidFiles).toHaveLength(2)
      expect(result.invalidFiles[0].path).toBe('photo.jpg')
      expect(result.invalidFiles[1].path).toBe('video.mp4')
    })

    test('should handle empty array', () => {
      const result = validateTextFiles([])
      expect(result.validFiles).toHaveLength(0)
      expect(result.invalidFiles).toHaveLength(0)
    })

    test('should handle all valid files', () => {
      const files = ['file1.txt', 'file2.js', 'file3.md']
      const result = validateTextFiles(files)
      expect(result.validFiles).toHaveLength(3)
      expect(result.invalidFiles).toHaveLength(0)
    })

    test('should handle all invalid files', () => {
      const files = ['image.png', 'video.mp4', 'audio.mp3']
      const result = validateTextFiles(files)
      expect(result.validFiles).toHaveLength(0)
      expect(result.invalidFiles).toHaveLength(3)
    })
  })

  describe('getFileExtension', () => {
    test('should extract standard extensions', () => {
      expect(getFileExtension('file.txt')).toBe('.txt')
      expect(getFileExtension('document.pdf')).toBe('.pdf')
      expect(getFileExtension('archive.tar.gz')).toBe('.gz')
    })

    test('should handle paths with directories', () => {
      expect(getFileExtension('/path/to/file.txt')).toBe('.txt')
      expect(getFileExtension('C:\\Users\\test\\file.md')).toBe('.md')
    })

    test('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('.gitignore')
      expect(getFileExtension('.env')).toBe('.env')
    })

    test('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('')
      expect(getFileExtension('Makefile')).toBe('')
    })

    test('should handle multiple dots', () => {
      expect(getFileExtension('file.backup.txt')).toBe('.txt')
      expect(getFileExtension('data.min.js')).toBe('.js')
    })
  })

  describe('getAllTextExtensions', () => {
    test('should return array of text extensions', () => {
      const extensions = getAllTextExtensions()
      expect(Array.isArray(extensions)).toBe(true)
      expect(extensions.length).toBeGreaterThan(0)
      expect(extensions).toContain('.txt')
      expect(extensions).toContain('.js')
      expect(extensions).toContain('.md')
    })
  })

  describe('getRejectedExtensions', () => {
    test('should return array of rejected extensions', () => {
      const extensions = getRejectedExtensions()
      expect(Array.isArray(extensions)).toBe(true)
      expect(extensions).toContain('.jpg')
      expect(extensions).toContain('.mp4')
      expect(extensions).toContain('.pdf')
    })
  })

  describe('isTextFileExtension', () => {
    test('should return true for text extensions', () => {
      expect(isTextFileExtension('.txt')).toBe(true)
      expect(isTextFileExtension('txt')).toBe(true)
      expect(isTextFileExtension('.js')).toBe(true)
      expect(isTextFileExtension('JS')).toBe(true)
    })

    test('should return false for non-text extensions', () => {
      expect(isTextFileExtension('.jpg')).toBe(false)
      expect(isTextFileExtension('.mp4')).toBe(false)
      expect(isTextFileExtension('.pdf')).toBe(false)
    })
  })

  describe('getFileTypeCategory', () => {
    test('should return category for valid text files', () => {
      expect(getFileTypeCategory('file.txt')).toBe('plainText')
      expect(getFileTypeCategory('script.js')).toBe('javascript')
      expect(getFileTypeCategory('app.py')).toBe('python')
    })

    test('should return file type for invalid files', () => {
      expect(getFileTypeCategory('image.jpg')).toBe('image')
      expect(getFileTypeCategory('video.mp4')).toBe('video')
      expect(getFileTypeCategory('audio.mp3')).toBe('audio')
    })
  })

  describe('getSupportedFileTypesDescription', () => {
    test('should return description string', () => {
      const description = getSupportedFileTypesDescription()
      expect(typeof description).toBe('string')
      expect(description.length).toBeGreaterThan(0)
      expect(description.toLowerCase()).toContain('text')
    })
  })

  describe('getRejectedFileTypesDescription', () => {
    test('should return description string', () => {
      const description = getRejectedFileTypesDescription()
      expect(typeof description).toBe('string')
      expect(description.length).toBeGreaterThan(0)
      expect(description).toContain('not supported')
    })
  })
})
