import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  ExternalHyperlink 
} from 'docx';

/**
 * Generates a DOCX buffer from structured resume JSON.
 * @param {Object} data - The resume JSON data (contact, summary, experience, education, skills, projects).
 * @returns {Promise<Buffer>} - The generated DOCX file buffer.
 */
export async function generateDocx(data) {
  const { contact, summary, experience, education, skills, projects } = data;

  const children = [];

  // Helper to add spacing
  const spacingParagraph = () => new Paragraph({ text: '', spacing: { before: 120, after: 120 } });

  // 1. Header (Contact Details)
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: contact.name || 'Your Name',
            bold: true,
            size: 40, // 20pt — ATS spec for Name
            font: 'Calibri',
            color: '2D2A26',
          }),
        ],
      })
    );

    const contactDetails = [];
    if (contact.email) contactDetails.push(contact.email);
    if (contact.phone) contactDetails.push(contact.phone);
    if (contact.location) contactDetails.push(contact.location);
    if (contact.website) contactDetails.push(contact.website);

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactDetails.join('  |  '),
            size: 20, // 10pt
            font: 'Calibri',
            color: '8A8478',
          }),
        ],
      })
    );
  }

  // Helper to build section dividers
  const createSectionHeader = (title) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: {
        bottom: {
          color: 'E8E4DA',
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 28, // 14pt — ATS spec for section headings
          font: 'Calibri',
          color: 'D97757',
        }),
      ],
    });
  };

  // 2. Summary Section
  if (summary) {
    children.push(createSectionHeader('Professional Summary'));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFY,
        children: [
          new TextRun({
            text: summary,
            size: 22, // 11pt
            font: 'Calibri',
            color: '2D2A26',
          }),
        ],
      })
    );
  }

  // 3. Experience Section
  if (experience && experience.length > 0) {
    children.push(createSectionHeader('Professional Experience'));

    experience.forEach((job) => {
      // Company and Location (bold and right aligned or inline)
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: job.company || '',
              bold: true,
              size: 22, // 11pt
              font: 'Calibri',
              color: '2D2A26',
            }),
            new TextRun({
              text: job.location ? ` — ${job.location}` : '',
              italic: true,
              size: 20, // 10pt
              font: 'Calibri',
              color: '8A8478',
            }),
          ],
        })
      );

      // Role and Dates
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: job.role || '',
              italic: true,
              bold: true,
              size: 20, // 10pt
              font: 'Calibri',
              color: 'BF5B3D', // Terracotta Secondary Accent
            }),
            new TextRun({
              text: (job.startDate || job.endDate) ? ` (${job.startDate || ''} - ${job.endDate || 'Present'})` : '',
              size: 20, // 10pt
              font: 'Calibri',
              color: '8A8478',
            }),
          ],
        })
      );

      // Bullet Points
      const bulletPoints = Array.isArray(job.description) ? job.description : [];
      bulletPoints.forEach((bullet) => {
        // Bullet could be a string or an object { originalText, tailoredText, isModified }
        let textContent = '';
        if (typeof bullet === 'string') {
          textContent = bullet;
        } else if (bullet && typeof bullet === 'object') {
          textContent = bullet.tailoredText || bullet.originalText || '';
        }

        if (textContent.trim()) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: textContent,
                  size: 22, // 11pt
                  font: 'Calibri',
                  color: '2D2A26',
                }),
              ],
            })
          );
        }
      });
    });
  }

  // 4. Projects Section
  if (projects && projects.length > 0) {
    children.push(createSectionHeader('Projects'));

    projects.forEach((proj) => {
      const techText = proj.techStack && proj.techStack.length > 0 
        ? ` (Technologies: ${proj.techStack.join(', ')})` 
        : '';
      
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: proj.title || 'Untitled Project',
              bold: true,
              size: 22,
              font: 'Calibri',
              color: '2D2A26',
            }),
            new TextRun({
              text: techText,
              italic: true,
              size: 20,
              font: 'Calibri',
              color: '8A8478',
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: proj.description || '',
              size: 22,
              font: 'Calibri',
              color: '2D2A26',
            }),
          ],
        })
      );
    });
  }

  // 5. Skills Section
  if (skills && skills.length > 0) {
    children.push(createSectionHeader('Technical Skills'));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: skills.join(', '),
            size: 22,
            font: 'Calibri',
            color: '2D2A26',
          }),
        ],
      })
    );
  }

  // 6. Education Section
  if (education && education.length > 0) {
    children.push(createSectionHeader('Education'));

    education.forEach((edu) => {
      const eduDetails = [];
      if (edu.degree) eduDetails.push(edu.degree);
      if (edu.fieldOfStudy) eduDetails.push(edu.fieldOfStudy);
      const degreeText = eduDetails.join(' in ');

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: edu.institution || '',
              bold: true,
              size: 22,
              font: 'Calibri',
              color: '2D2A26',
            }),
            new TextRun({
              text: edu.endDate ? ` (Graduated: ${edu.endDate})` : '',
              size: 20,
              font: 'Calibri',
              color: '8A8478',
            }),
          ],
        })
      );

      if (degreeText || edu.grade) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: degreeText || '',
                size: 20,
                font: 'Calibri',
                color: '2D2A26',
              }),
              new TextRun({
                text: edu.grade ? ` — GPA/Grade: ${edu.grade}` : '',
                italic: true,
                size: 20,
                font: 'Calibri',
                color: '8A8478',
              }),
            ],
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch (720 twips)
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
