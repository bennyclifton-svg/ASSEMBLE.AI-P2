import { describe, expect, test, beforeAll } from '@jest/globals';

describe('API Endpoints Integration Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const testProjectId = 'test-project-001';

  describe('GET /api/categories/active', () => {
    test('should return 400 when projectId is missing', async () => {
      const response = await fetch(`${baseUrl}/api/categories/active`);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('projectId is required');
    });

    test('should return active categories for valid projectId', async () => {
      const response = await fetch(`${baseUrl}/api/categories/active?projectId=${testProjectId}`);
      expect(response.status).toBe(200);

      const categories = await response.json();
      expect(Array.isArray(categories)).toBe(true);

      // Should have the standard categories
      const categoryIds = categories.map((c: any) => c.id);
      expect(categoryIds).toContain('planning');
      expect(categoryIds).toContain('scheme-design');
      expect(categoryIds).toContain('detail-design');
      expect(categoryIds).toContain('consultants');
      expect(categoryIds).toContain('contractors');
      expect(categoryIds).toContain('cost-planning');
      expect(categoryIds).toContain('administration');

      // Check consultants and contractors have subcategories if enabled
      const consultantsCategory = categories.find((c: any) => c.id === 'consultants');
      if (consultantsCategory) {
        expect(consultantsCategory.hasSubcategories).toBe(true);
        expect(consultantsCategory.subcategorySource).toBe('consultants');
        expect(Array.isArray(consultantsCategory.subcategories)).toBe(true);
      }

      const contractorsCategory = categories.find((c: any) => c.id === 'contractors');
      if (contractorsCategory) {
        expect(contractorsCategory.hasSubcategories).toBe(true);
        expect(contractorsCategory.subcategorySource).toBe('contractors');
        expect(Array.isArray(contractorsCategory.subcategories)).toBe(true);
      }
    });
  });

  describe('POST /api/documents', () => {
    test('should accept and persist categoryId parameter', async () => {
      const formData = new FormData();
      const testFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });

      formData.append('file', testFile);
      formData.append('projectId', testProjectId);
      formData.append('categoryId', 'planning');

      const response = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();
      expect(data.versionId).toBeDefined();
      expect(data.versionNumber).toBe(1);

      // Verify the document was created with the correct category
      const getResponse = await fetch(`${baseUrl}/api/documents?projectId=${testProjectId}`);
      const documents = await getResponse.json();

      const createdDoc = documents.find((d: any) => d.id === data.documentId);
      expect(createdDoc).toBeDefined();
      expect(createdDoc.categoryId).toBe('planning');
      expect(createdDoc.categoryName).toBe('Planning');
    });

    test('should handle documents without categoryId (backward compatibility)', async () => {
      const formData = new FormData();
      const testFile = new File(['test content 2'], 'uncategorized-document.pdf', { type: 'application/pdf' });

      formData.append('file', testFile);
      formData.append('projectId', testProjectId);
      // No categoryId provided

      const response = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();

      // Verify the document was created without a category
      const getResponse = await fetch(`${baseUrl}/api/documents?projectId=${testProjectId}`);
      const documents = await getResponse.json();

      const createdDoc = documents.find((d: any) => d.id === data.documentId);
      expect(createdDoc).toBeDefined();
      expect(createdDoc.categoryId).toBeNull();
      expect(createdDoc.categoryName).toBeNull();
    });

    test('should return 400 when no file is provided', async () => {
      const formData = new FormData();
      formData.append('projectId', testProjectId);

      const response = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No file provided');
    });

    test('should return 400 when no projectId is provided', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', testFile);

      const response = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No project ID provided');
    });
  });
});