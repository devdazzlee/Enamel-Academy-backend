# Complete API Endpoints List

**Total Unique Endpoints:** 78  
**Total Requests:** 162  
**Generated:** 2026-03-04

---

## 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wp-json/reactapi/v1/register` | Register new user |
| POST | `/wp-json/reactapi/v1/login` | User login |
| GET | `/wp-json/reactapi/v1/user` | Get current user details |
| POST | `/wp-json/reactapi/v1/validate-token` | Validate JWT token |
| PUT | `/wp-json/reactapi/v1/user/update` | Update user profile |
| POST | `/wp-json/reactapi/v1/user/change-password` | Change user password |
| POST | `/wp-json/reactapi/v1/logout` | User logout |

---

## 🔑 Password Reset

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wp-json/reactapi/v1/forgot-password` | Request password reset OTP |
| POST | `/wp-json/reactapi/v1/verify-otp` | Verify OTP for password reset |
| POST | `/wp-json/reactapi/v1/reset-password` | Reset password with token |
| POST | `/wp-json/reactapi/v1/validate-reset-token` | Validate reset token |

---

## 🦷 Dental Roles & Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/dental/roles` | Get all dental roles |
| GET | `/wp-json/reactapi/v1/dental/permissions/dentist` | Get dentist permissions |
| GET | `/wp-json/reactapi/v1/dental/permissions/dental_nurse` | Get dental nurse permissions |
| GET | `/wp-json/reactapi/v1/dental/permissions/dental_care_professional` | Get DCP permissions |

---

## 📊 Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/dashboard` | Get user dashboard |
| GET | `/wp-json/reactapi/v1/dashboard/stats` | Get dashboard statistics |
| GET | `/wp-json/reactapi/v1/dashboard/continue-learning` | Get continue learning courses |
| GET | `/wp-json/reactapi/v1/dashboard/courses/{id}` | Get course details by ID |

---

## 📚 Course Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/courses/library` | Get course library (with filters) |
| GET | `/wp-json/reactapi/v1/courses` | Get course by ID or slug (query: `?id=123` or `?slug=course-slug`) |
| GET | `/wp-json/reactapi/v1/courses/ongoing` | Get ongoing courses |
| GET | `/wp-json/reactapi/v1/courses/categories` | Get course categories |
| GET | `/wp-json/reactapi/v1/courses/filters` | Get available filters |
| POST | `/wp-json/reactapi/v1/courses/enroll/{id}` | Enroll user in course |

---

## 📝 Course Progress & Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wp-json/reactapi/v1/courses/{id}/progress` | Track course progress |
| POST | `/wp-json/reactapi/v1/courses/{id}/lessons/{lessonId}/complete` | Mark lesson complete |
| POST | `/wp-json/reactapi/v1/courses/{id}/topics/{topicId}/complete` | Mark topic complete |

---

## 📝 Course Reflection & Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wp-json/reactapi/v1/courses/{id}/reflection` | Save course reflection |
| GET | `/wp-json/reactapi/v1/courses/{id}/reflection` | Get course reflection |
| GET | `/wp-json/reactapi/v1/courses/{id}/reflections` | Get all reflections |
| POST | `/wp-json/reactapi/v1/courses/{id}/feedback` | Save course feedback |
| GET | `/wp-json/reactapi/v1/courses/{id}/feedback` | Get course feedback |

---

## 📋 Assignments & Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/courses/{id}/assignments` | Get course assignments |
| GET | `/wp-json/reactapi/v1/courses/{id}/quizzes` | Get course quizzes |
| GET | `/wp-json/reactapi/v1/courses/{id}/assessments` | Get course assessments |
| GET | `/wp-json/reactapi/v1/courses/{id}/assignment-stats` | Get assignment statistics |
| GET | `/wp-json/reactapi/v1/courses/{id}/quiz-stats` | Get quiz statistics |
| GET | `/wp-json/reactapi/v1/assignments/{assignmentId}` | Get assignment details (format: `assignment_123`) |
| GET | `/wp-json/reactapi/v1/quizzes/{id}` | Get quiz details |
| GET | `/wp-json/reactapi/v1/quizzes/{id}/attempts` | Get quiz attempts |

---

## 📜 Certificates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/certificates/course/{id}` | Get course certificate |
| GET | `/wp-json/reactapi/v1/certificates/my-certificates` | Get all user certificates |
| GET | `/wp-json/reactapi/v1/certificates/check/{id}` | Check certificate availability |
| GET | `/wp-json/reactapi/v1/certificates/preview/{id}` | Preview certificate design |
| POST | `/wp-json/reactapi/v1/certificates/verify` | Verify certificate (public) |

---

## 📈 CPD Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/cpd/summary` | Get CPD summary |
| GET | `/wp-json/reactapi/v1/cpd/history` | Get CPD history (query: `?year=2025&limit=20&offset=0`) |
| GET | `/wp-json/reactapi/v1/cpd/analytics` | Get CPD analytics |
| GET | `/wp-json/reactapi/v1/cpd/requirements/dentist` | Get CPD requirements for dentist |
| GET | `/wp-json/reactapi/v1/cpd/requirements/dental_nurse` | Get CPD requirements for dental nurse |
| GET | `/wp-json/reactapi/v1/cpd/requirements/dental_care_professional` | Get CPD requirements for DCP |
| POST | `/wp-json/reactapi/v1/cpd/log-external` | Log external CPD activity |
| POST | `/wp-json/reactapi/v1/cpd/generate-audit-report` | Generate audit report (PDF/Excel/ZIP) |

---

## 📋 Personal Development Plan (PDP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/pdp` | Get all PDPs (query: `?status=active&year=2025&per_page=10&page=1`) |
| GET | `/wp-json/reactapi/v1/pdp/{id}` | Get single PDP |
| POST | `/wp-json/reactapi/v1/pdp` | Create PDP |
| PUT | `/wp-json/reactapi/v1/pdp/{id}` | Update PDP |
| PUT | `/wp-json/reactapi/v1/pdp/{id}/status` | Update PDP status |
| DELETE | `/wp-json/reactapi/v1/pdp/{id}` | Delete PDP |
| GET | `/wp-json/reactapi/v1/pdp/stats` | Get PDP statistics |
| GET | `/wp-json/reactapi/v1/pdp/skills-library` | Get skills library |

### PDP Components

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wp-json/reactapi/v1/pdp/{id}/objectives` | Add career objective |
| POST | `/wp-json/reactapi/v1/pdp/{id}/skills` | Add skill (current or to develop) |
| POST | `/wp-json/reactapi/v1/pdp/{id}/activities` | Add learning activity |
| POST | `/wp-json/reactapi/v1/pdp/{id}/milestones` | Add milestone |
| POST | `/wp-json/reactapi/v1/pdp/{id}/reflection` | Add reflection |
| POST | `/wp-json/reactapi/v1/pdp/{id}/link-course` | Link course to PDP activity |

---

## 🧪 Test API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-json/reactapi/v1/TESTApi` | Test API endpoint |

---

## 📝 Notes

- All endpoints require authentication via Bearer token (JWT) except:
  - `/wp-json/reactapi/v1/register`
  - `/wp-json/reactapi/v1/login`
  - `/wp-json/reactapi/v1/forgot-password`
  - `/wp-json/reactapi/v1/verify-otp`
  - `/wp-json/reactapi/v1/reset-password`
  - `/wp-json/reactapi/v1/validate-reset-token`
  - `/wp-json/reactapi/v1/certificates/verify` (public)

- Replace `{id}`, `{lessonId}`, `{topicId}`, `{assignmentId}` with actual IDs in requests

- Query parameters are shown in examples where applicable

- Base URL: `https://cpd.enamelacademy.co.uk` (or your environment's base URL)

---

**Last Updated:** 2026-03-04  
**Source Files:**
- React_API_PDP_Postman_Collection (1).json
- React_Dental_API_Postman_Collection.json
- cpd.enamelacademy.co.uk.postman_collection (8).json
- cpd.enamelacademy.co.uk.postman_collection (9).json
- cpd.enamelacademy.co.uk.postman_collection (10).json
