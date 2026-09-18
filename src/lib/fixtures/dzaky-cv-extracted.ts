/** Extracted text from CV - Dzaky Iman Ajiputro.pdf (Drive fixture only; PDF not in repo). */
export const DZAKY_CV_EXTRACTED_TEXT = `

Dzaky Iman Ajiputro 
+628170240900 | dzaky.ajiputro@gmail.com | linkedin.com/in/dzaky-iman-ajiputro 
 
Engineering  graduate  with  diverse  experience  in  consulting  and  a  management  trainee  program.  Proven 
ability  to  lead  cross-functional  teams  and deliver  strategic,  analytical,  and  operational  initiatives  across 
business,  technology,  and  organizational  development  areas.  Skilled  in  problem-solving,  communication, 
and project management, with a strong drive to create meaningful impact in dynamic environments. 
 
EDUCATION  
 
 
University of Indonesia Sep 2019 – Sep 2023 
Bachelor’s Degree in Metallurgical and Materials Engineering  
• GPA: 3.61/4.00 
 
WORK EXPERIENCE  
 
 
Bank Danamon Indonesia Jun 2024 – Jun 2025 
Danamon Bankers Trainee – Enterprise Banking Business Analyst  
• Selected  as  one  of  50  candidates  from  thousands  for  a  comprehensive  training  program  covering  core 
banking businesses and operations, and structured development in soft skills. 
• Collaborated with stakeholders to develop and present a comprehensive project proposal, applying both 
technical knowledge and professional communication skills. 
• Conducted industrial  and financial  analysis of corporate  clients  in  Enterprise  Banking,  focusing  on  key 
metrics such as working capital efficiency, profitability, and risk mitigation. 
• Developed a comprehensive industry guidebook to support end-to-end credit evaluation, covering from 
industrial and financial performance analysis to risk and mitigation analysis. 
 
KMPlus Consulting Mar 2023 – Jun 2024 
Business Analyst  
• Led the development of Portaverse Talent and Portaverse Performance, PT Pelindo’s enterprise platforms 
designed  to  manage  organizational  hierarchy  and  performance  evaluations  across 15+  subsidiaries,  4 
regional areas, and over 15,000 employees. 
• Facilitated requirement gathering through Focus Group Discussions with stakeholders and transformed 
business needs into clear functional specifications. 
• Directed end-to-end system development by coordinating with UI/UX designers, front-end and back-end 
developers, and QA engineers. 
• Managed product delivery by prioritizing the backlog, defining delivery milestones, and ensuring delivery 
timeline. 
 
Citra Tubindo Jun 2022 – Jul 2022 
Heat Treatment and Metallurgy Lab Intern  
• Studied and assisted heat treatment operations for OCTG pipes, including preparation, production, and 
inspection stages. 
• Collected and analyzed experimental data, performed statistical evaluations, and documented technical 
findings. 
• Collaborated with team members on research projects and contributed to discussions and knowledge 
sharing to provide improvement recommendations for heat treatment process. 

 
ORGANIZATIONAL EXPERIENCE  
 
 
Faculty of Engineering Student Executive Boards (BEM FT UI) Feb 2022 – Jan 2023 
Head Coordinator of Internal Division  
• Led and coordinated 3 major departments: Secretary, Human Resource, and Research and 
Development, with a total of 7 department heads and 33 staff 
• Increased BEM FT UI staff’s performance score by 10% from the first to last quarter by implementing a 
self-development program 
• Developed a Data Centre that tracks the organization’s activities and objectives progress 
 
Metallurgical and Materials Engineering Student Council (IMMt FT UI) Feb 2021 – Jan 2022 
Head of Research and Development  
• Appointed to be The Second Man of IMMt FT UI and awarded as “Best Division Head of The Quarter” 
• Led a division consisting of 11 staff to support the continuous improvement of this organization 
• Managed various consulting strategies to improve internal and external performance of every division 
• Developed a Quality Management System to improve all the event and project evaluations for the next 
management 
 
VOLUNTEERING & COMMITTEE EXPERIENCE 
 
 
The 15
th
 Metallurgy and Materials Week Jul 2020 – Dec 2020 
Staff of Media Partner  
• Managed outreach to prospective media partners to expand event visibility 
• Cooperated with 5+ media partners to promote the event 
 
Metal Inner Day 2019 Nov 1
st
 – 2
nd
, 2019 
Volunteer Member  
• Taught elementary school students about how to maintain health in everyday life 
• Opened a free health clinic and a small bazaar for villagers 
 
CERTIFICATION & PROJECT 
 
 
New York Institute of Finance through Coursera Oct 2024 
• Coursework: Introduction to Risk Management 
 
University of California, Irvine through Coursera Oct 2024 
• Coursework: Effective Problem-Solving and Decision Making 
 
IBM Skills Network through Coursera Feb 2023 
• Coursework: Machine Learning with Python 
 
ADDITIONAL  
 
 
Technical Skills : Microsoft Office, SQL  
Languages  : Native Indonesian Speaker, Proficient in English 
Personal Skill  : Project Management, Leadership, Communication, Critical Thinking `;

export const DZAKY_CV_PROPOSED = {
  name: "Dzaky Iman Ajiputro",
  email: "dzaky.ajiputro@gmail.com",
  linkedin: "linkedin.com/in/dzaky-iman-ajiputro",
  education: JSON.stringify([
    {
      institution: "University of Indonesia",
      credential: "Bachelor's Degree in Metallurgical and Materials Engineering",
      startDate: "2019-09",
      endDate: "2023-09",
      gpa: "3.61/4.00",
    },
  ]),
  experience: JSON.stringify([
    {
      kind: "work",
      organization: "Bank Danamon Indonesia",
      title: "Danamon Bankers Trainee – Enterprise Banking Business Analyst",
      startDate: "2024-06",
      endDate: "2025-06",
      narrative: "Enterprise Banking analysis and credit evaluation guidebook.",
    },
    {
      kind: "work",
      organization: "KMPlus Consulting",
      title: "Business Analyst",
      startDate: "2023-03",
      endDate: "2024-06",
      narrative: "Requirements, delivery coordination, and product milestones.",
    },
    {
      kind: "work",
      organization: "Citra Tubindo",
      title: "Heat Treatment and Metallurgy Lab Intern",
      startDate: "2022-06",
      endDate: "2022-07",
      narrative: "Heat treatment operations and experimental analysis.",
    },
    {
      kind: "organization",
      organization: "Faculty of Engineering Student Executive Boards (BEM FT UI)",
      title: "Head Coordinator of Internal Division",
      startDate: "2022-02",
      endDate: "2023-01",
      narrative: "Led secretary, HR, and R&D departments.",
    },
    {
      kind: "organization",
      organization: "Metallurgical and Materials Engineering Student Council (IMMt FT UI)",
      title: "Head of Research and Development",
      startDate: "2021-02",
      endDate: "2022-01",
      narrative: "Division leadership and quality management system.",
    },
    {
      kind: "volunteer",
      organization: "The 15th Metallurgy and Materials Week",
      title: "Staff of Media Partner",
      startDate: "2020-07",
      endDate: "2020-12",
      narrative: "Media partner outreach.",
    },
    {
      kind: "volunteer",
      organization: "Metal Inner Day 2019",
      title: "Volunteer Member",
      startDate: "2019-11-01",
      endDate: "2019-11-02",
      narrative: "Community health education and clinic.",
    },
  ]),
  skills: JSON.stringify([
    { name: "Microsoft Office", kind: "technical" },
    { name: "SQL", kind: "technical" },
    { name: "Indonesian", kind: "language" },
    { name: "English", kind: "language" },
    { name: "Project Management", kind: "personal" },
    { name: "Leadership", kind: "personal" },
    { name: "Communication", kind: "personal" },
    { name: "Critical Thinking", kind: "personal" },
  ]),
  certifications: JSON.stringify([
    {
      issuer: "New York Institute of Finance through Coursera",
      name: "Introduction to Risk Management",
      date: "2024-10",
    },
    {
      issuer: "University of California, Irvine through Coursera",
      name: "Effective Problem-Solving and Decision Making",
      date: "2024-10",
    },
    {
      issuer: "IBM Skills Network through Coursera",
      name: "Machine Learning with Python",
      date: "2023-02",
    },
  ]),
};
