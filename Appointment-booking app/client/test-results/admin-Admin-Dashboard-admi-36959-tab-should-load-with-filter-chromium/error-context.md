# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin Dashboard >> admin appointments tab should load with filter
- Location: e2e\admin.spec.js:184:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('nav button').filter({ hasText: 'Admin' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - button "My Business Salon & Spa" [ref=e7]:
        - img [ref=e9]
        - generic [ref=e11]:
          - generic [ref=e12]: My Business
          - generic [ref=e13]: Salon & Spa
      - generic [ref=e14]:
        - button "Services" [ref=e15]:
          - img [ref=e16]
          - text: Services
        - button "Book Appointment" [ref=e20]:
          - img [ref=e21]
          - text: Book Appointment
        - button "My Appointments" [ref=e23]:
          - img [ref=e24]
          - text: My Appointments
      - generic [ref=e26]:
        - button "Switch to dark mode" [ref=e27]:
          - img [ref=e28]
        - generic [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]: E
            - generic [ref=e33]: E2E Admin
          - button "Sign Out" [ref=e34]:
            - img [ref=e35]
            - generic [ref=e38]: Sign Out
  - main [ref=e39]:
    - generic [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]: Our Services
        - heading "My Business, Expertly Crafted" [level=1] [ref=e43]:
          - text: My Business,
          - text: Expertly Crafted
        - paragraph [ref=e44]: Choose from our curated range of professional services
      - generic [ref=e45]:
        - generic [ref=e46]:
          - generic:
            - img
          - textbox "Search services..." [ref=e47]
        - combobox [ref=e49] [cursor=pointer]:
          - option "All Categories" [selected]
          - option "Grooming"
          - option "Hair"
          - option "Makeup"
          - option "Nails"
          - option "Skincare"
          - option "Wellness"
      - generic [ref=e50]:
        - generic [ref=e53]:
          - heading "Grooming" [level=2] [ref=e54]
          - paragraph [ref=e55]: 1 service
        - generic [ref=e60]:
          - generic [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e64]: Grooming
              - img [ref=e66]
            - heading "Beard Trim & Shave" [level=3] [ref=e70]
            - paragraph [ref=e71]: Precision beard trim with hot towel shave
          - generic [ref=e72]:
            - generic [ref=e73]:
              - img [ref=e74]
              - generic [ref=e77]: 30 min
            - generic [ref=e78]: $30.00
      - generic [ref=e79]:
        - generic [ref=e82]:
          - heading "Hair" [level=2] [ref=e83]
          - paragraph [ref=e84]: 2 services
        - generic [ref=e86]:
          - generic [ref=e89]:
            - generic [ref=e91]:
              - generic [ref=e92]:
                - generic [ref=e93]: Hair
                - img [ref=e95]
              - heading "Hair Coloring" [level=3] [ref=e99]
              - paragraph [ref=e100]: Full hair coloring with premium products
            - generic [ref=e101]:
              - generic [ref=e102]:
                - img [ref=e103]
                - generic [ref=e106]: 90 min
              - generic [ref=e107]: $85.00
          - generic [ref=e110]:
            - generic [ref=e112]:
              - generic [ref=e113]:
                - generic [ref=e114]: Hair
                - img [ref=e116]
              - heading "Haircut & Styling" [level=3] [ref=e120]
              - paragraph [ref=e121]: Professional haircut and styling service
            - generic [ref=e122]:
              - generic [ref=e123]:
                - img [ref=e124]
                - generic [ref=e127]: 45 min
              - generic [ref=e128]: $45.00
      - generic [ref=e129]:
        - generic [ref=e132]:
          - heading "Makeup" [level=2] [ref=e133]
          - paragraph [ref=e134]: 1 service
        - generic [ref=e139]:
          - generic [ref=e141]:
            - generic [ref=e142]:
              - generic [ref=e143]: Makeup
              - img [ref=e145]
            - heading "Makeup Application" [level=3] [ref=e149]
            - paragraph [ref=e150]: Professional makeup for any occasion
          - generic [ref=e151]:
            - generic [ref=e152]:
              - img [ref=e153]
              - generic [ref=e156]: 60 min
            - generic [ref=e157]: $55.00
      - generic [ref=e158]:
        - generic [ref=e161]:
          - heading "Nails" [level=2] [ref=e162]
          - paragraph [ref=e163]: 2 services
        - generic [ref=e165]:
          - generic [ref=e168]:
            - generic [ref=e170]:
              - generic [ref=e171]:
                - generic [ref=e172]: Nails
                - img [ref=e174]
              - heading "Manicure" [level=3] [ref=e178]
              - paragraph [ref=e179]: Classic manicure with nail shaping and polish
            - generic [ref=e180]:
              - generic [ref=e181]:
                - img [ref=e182]
                - generic [ref=e185]: 45 min
              - generic [ref=e186]: $35.00
          - generic [ref=e189]:
            - generic [ref=e191]:
              - generic [ref=e192]:
                - generic [ref=e193]: Nails
                - img [ref=e195]
              - heading "Pedicure" [level=3] [ref=e199]
              - paragraph [ref=e200]: Relaxing pedicure with foot massage
            - generic [ref=e201]:
              - generic [ref=e202]:
                - img [ref=e203]
                - generic [ref=e206]: 60 min
              - generic [ref=e207]: $45.00
      - generic [ref=e208]:
        - generic [ref=e211]:
          - heading "Skincare" [level=2] [ref=e212]
          - paragraph [ref=e213]: 1 service
        - generic [ref=e218]:
          - generic [ref=e220]:
            - generic [ref=e221]:
              - generic [ref=e222]: Skincare
              - img [ref=e224]
            - heading "Facial Treatment" [level=3] [ref=e228]
            - paragraph [ref=e229]: Deep cleansing facial with mask and massage
          - generic [ref=e230]:
            - generic [ref=e231]:
              - img [ref=e232]
              - generic [ref=e235]: 60 min
            - generic [ref=e236]: $65.00
      - generic [ref=e237]:
        - generic [ref=e240]:
          - heading "Wellness" [level=2] [ref=e241]
          - paragraph [ref=e242]: 1 service
        - generic [ref=e247]:
          - generic [ref=e249]:
            - generic [ref=e250]:
              - generic [ref=e251]: Wellness
              - img [ref=e253]
            - heading "Massage Therapy" [level=3] [ref=e257]
            - paragraph [ref=e258]: Full body relaxation massage
          - generic [ref=e259]:
            - generic [ref=e260]:
              - img [ref=e261]
              - generic [ref=e264]: 60 min
            - generic [ref=e265]: $75.00
  - contentinfo [ref=e266]:
    - generic [ref=e268]:
      - generic [ref=e269]:
        - img [ref=e271]
        - generic [ref=e273]: My Business
      - paragraph [ref=e274]: © 2026 — Online booking platform
```

# Test source

```ts
  88  |   });
  89  | 
  90  |   test('should not show admin tab for regular users', async ({ page }) => {
  91  |     const user = createTestUser();
  92  | 
  93  |     // Register via API
  94  |     await page.request.post('http://localhost:3001/api/auth/register', {
  95  |       data: { name: user.name, email: user.email, password: user.password },
  96  |     });
  97  | 
  98  |     // Login
  99  |     await page.goto('/');
  100 |     await page.waitForLoadState('domcontentloaded');
  101 |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  102 |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  103 |     await page.fill('input[type="email"]', user.email);
  104 |     await page.fill('input[type="password"]', user.password);
  105 |     await page.locator('button[type="submit"]').click();
  106 |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  107 | 
  108 |     // Admin tab should NOT be visible for regular users
  109 |     await expect(page.locator('nav button', { hasText: 'Admin' })).not.toBeVisible();
  110 |   });
  111 | 
  112 |   test('admin dashboard should show stats cards', async ({ page }) => {
  113 |     await loginAsAdmin(page);
  114 | 
  115 |     // Navigate to admin
  116 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  117 |     await page.waitForLoadState('domcontentloaded');
  118 | 
  119 |     // Should see the admin dashboard header
  120 |     await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10_000 });
  121 | 
  122 |     // Should see stats cards
  123 |     await expect(page.locator('text=Active Services')).toBeVisible({ timeout: 5_000 });
  124 |     await expect(page.locator('text=Total Appointments')).toBeVisible({ timeout: 5_000 });
  125 |     await expect(page.locator('text=Registered Users')).toBeVisible({ timeout: 5_000 });
  126 |   });
  127 | 
  128 |   test('admin services tab should list seeded services', async ({ page }) => {
  129 |     await loginAsAdmin(page);
  130 | 
  131 |     // Navigate to admin
  132 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  133 |     await page.waitForLoadState('domcontentloaded');
  134 | 
  135 |     // Should be on services tab by default
  136 |     await expect(page.locator('text=Manage Services')).toBeVisible({ timeout: 10_000 });
  137 | 
  138 |     // Should see seed services listed
  139 |     await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  140 |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  141 |   });
  142 | 
  143 |   test('should allow creating a new service', async ({ page }) => {
  144 |     await loginAsAdmin(page);
  145 | 
  146 |     // Navigate to admin
  147 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  148 |     await page.waitForLoadState('domcontentloaded');
  149 | 
  150 |     // Click Add Service button
  151 |     await page.locator('button:has-text("Add Service"):not(nav *)').click();
  152 | 
  153 |     // Wait for the service form modal to appear
  154 |     await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5_000 });
  155 | 
  156 |     // Fill the service name (first text input in the modal)
  157 |     const modalTextInputs = page.locator('text=Add New Service').locator('..').locator('input[type="text"]');
  158 |     await modalTextInputs.first().fill('E2E Test Service');
  159 | 
  160 |     // Fill duration (first number input)
  161 |     const numberInputs = page.locator('input[type="number"]');
  162 |     await numberInputs.first().fill('30');
  163 | 
  164 |     // Fill price (second number input)
  165 |     await numberInputs.nth(1).fill('50');
  166 | 
  167 |     // Fill category (second text input)
  168 |     const allTextInputs = page.locator('input[type="text"]');
  169 |     if (await allTextInputs.count() > 1) {
  170 |       await allTextInputs.nth(1).fill('Testing');
  171 |     }
  172 | 
  173 |     // Fill description textarea
  174 |     const textarea = page.locator('textarea');
  175 |     if (await textarea.isVisible()) {
  176 |       await textarea.fill('Service created by E2E test');
  177 |     }
  178 | 
  179 |     // Submit and wait for the new service to appear in the table
  180 |     await page.locator('button[type="submit"]:has-text("Create Service")').click();
  181 |     await expect(page.locator('text=E2E Test Service').first()).toBeVisible({ timeout: 10_000 });
  182 |   });
  183 | 
  184 |   test('admin appointments tab should load with filter', async ({ page }) => {
  185 |     await loginAsAdmin(page);
  186 | 
  187 |     // Navigate to admin
> 188 |     await page.locator('nav button', { hasText: 'Admin' }).click();
      |                                                            ^ Error: locator.click: Test timeout of 60000ms exceeded.
  189 |     await page.waitForLoadState('domcontentloaded');
  190 | 
  191 |     // Click Appointments tab (in the tab bar, not navbar)
  192 |     const tabBar = page.locator('button:has-text("Appointments"):not(nav *)');
  193 |     await tabBar.first().click();
  194 |     await page.waitForLoadState('domcontentloaded');
  195 | 
  196 |     // Should see the appointments section
  197 |     await expect(page.locator('text=All Appointments')).toBeVisible({ timeout: 10_000 });
  198 | 
  199 |     // Status filter select should be present
  200 |     const filterSelect = page.locator('select').first();
  201 |     await expect(filterSelect).toBeVisible({ timeout: 5_000 });
  202 |   });
  203 | 
  204 |   test('admin users tab should load user list', async ({ page }) => {
  205 |     await loginAsAdmin(page);
  206 | 
  207 |     // Navigate to admin
  208 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  209 |     await page.waitForLoadState('domcontentloaded');
  210 | 
  211 |     // Click Users tab (in the tab bar, not navbar)
  212 |     const usersTab = page.locator('button:has-text("Users"):not(nav *)');
  213 |     await usersTab.first().click();
  214 |     await page.waitForLoadState('domcontentloaded');
  215 | 
  216 |     // Should see user management
  217 |     await expect(page.locator('text=User Management')).toBeVisible({ timeout: 10_000 });
  218 | 
  219 |     // Should see at least one user (the admin)
  220 |     await expect(page.locator('text=E2E Admin').first()).toBeVisible({ timeout: 5_000 });
  221 |   });
  222 | });
  223 | 
```