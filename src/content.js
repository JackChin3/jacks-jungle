export const profile = {
  name: "Jack Chin",
  tagline: "I build AI tools, robotics systems, and strategy-facing products.",
  location: "Piedmont, CA / Claremont, CA",
  status: "Pomona CS + Philosophy, incoming BCG Associate",
  email: "Jsck2022@mymail.pomona.edu",
  phone: "(510) 599-8448",
  resume: "/Jack_Chin_Resume.pdf",
  links: [
    { label: "Email", href: "mailto:Jsck2022@mymail.pomona.edu" },
    { label: "Resume", href: "/Jack_Chin_Resume.pdf" }
  ]
};

export const workItems = [
  {
    id: "bcg",
    section: "Strategy Tower",
    title: "Boston Consulting Group",
    role: "Summer Associate / Incoming Associate",
    period: "June 2025 - August 2025",
    type: "Experience",
    signal: "AI workflow systems for strategic partnerships",
    dialogue:
      "Strategy Tower keeps the work tight: AI tools that make executive workflows move faster, not louder.",
    details:
      "Built and presented AI-enabled workflow improvements for a global cloud service provider's strategic partnerships team.",
    highlights: [
      "Implemented agentic solutions to eliminate low-lift partnership tasks and increase deal velocity.",
      "Presented AI initiative findings to North America senior leadership.",
      "Demonstrated 12.5%+ projected efficiency gains and secured executive buy-in.",
      "Led development of an internal GenAI access tool used by 40+ global team members."
    ],
    metrics: ["12.5%+ efficiency upside", "40+ global users", "executive presentation"],
    jungleObject: "tower"
  },
  {
    id: "robotics",
    section: "Robotics Lab",
    title: "Robotics Systems",
    role: "Course Developer / Founder / Team Captain",
    period: "2015 - 2024",
    type: "Experience",
    signal: "Autonomous robots, teaching, and competition systems",
    dialogue:
      "This lab is where the builder habit started: robots, curriculum, messy prototypes, and a lot of earned precision.",
    details:
      "Developed autonomous robotics course material, co-founded a robotics education company, and led VEX teams at state and world championship levels.",
    highlights: [
      "Awarded a selective research grant to develop Pomona CS course material on software for autonomous robots.",
      "Co-founded Innovate Robotics, a robotics education company generating $20K+ in revenue.",
      "Led 20+ students across four robotics subteams.",
      "Won multiple California State Championships and placed 5th at the 2022 VEX World Championship."
    ],
    metrics: ["5th at Worlds", "$20K+ revenue", "20+ students led"],
    jungleObject: "robot"
  },
  {
    id: "paper-prisons",
    section: "Data Archive",
    title: "Paper Prisons Initiative",
    role: "Project Manager",
    period: "May 2023 - August 2023",
    type: "Experience",
    signal: "Data analysis for criminal justice policy",
    dialogue:
      "The archive is dense for a reason: 600,000 records, policy stakes, and tools built to help research move faster.",
    details:
      "Led graduate-student research through large-scale criminal-record analysis and integrated custom GenAI research tooling.",
    highlights: [
      "Managed analysis of 600,000+ criminal records.",
      "Produced reports influencing criminal justice legislation across the United States.",
      "Created GenAI research tools that improved team efficiency by 10%+."
    ],
    metrics: ["600K+ records", "10%+ efficiency gain", "policy impact"],
    jungleObject: "archive"
  },
  {
    id: "incubator",
    section: "Incubator / Hacker House",
    title: "P-AI + Sparkathon",
    role: "Director of Projects / Case Competition Winner",
    period: "2024 - Present",
    type: "Leadership",
    signal: "AI project leadership and fast-build strategy",
    dialogue:
      "The hacker house is for the 1 AM part: shipping prototypes, leading builders, and turning vague ideas into working demos.",
    details:
      "Directing AI initiatives through the Claremont Colleges tech incubator and building competition-winning strategy with technical depth.",
    highlights: [
      "Directing multiple AI initiatives and supporting project managers with technical expertise.",
      "Managed six software developers building a CV/NLP model for user-submitted video analysis.",
      "Won Sparkathon Fall 2025, placing 1st out of 30+ teams."
    ],
    metrics: ["1st / 30+ teams", "$1.5K prize", "6 developers managed"],
    jungleObject: "house"
  },
  {
    id: "pomona",
    section: "Campus Quad",
    title: "Pomona College",
    role: "BA Computer Science + Philosophy",
    period: "Expected May 2026",
    type: "Education",
    signal: "Technical depth with philosophical range",
    dialogue:
      "The quad is the clean part of the transcript: CS, philosophy, TA work, and a GPA that does not need much decoration.",
    details:
      "Studying Computer Science and Philosophy at Pomona College with teaching roles across core technical courses.",
    highlights: [
      "GPA: 3.97 / 4.0.",
      "Phi Beta Kappa and National Merit Scholarship Finalist.",
      "Teaching Assistant for Mobile Robotics, Algorithms and Data Structures, and Statistics.",
      "ACT: 36 / 36."
    ],
    metrics: ["3.97 GPA", "Phi Beta Kappa", "TA x3"],
    jungleObject: "quad"
  },
  {
    id: "trophy-hall",
    section: "Trophy Hall",
    title: "Artifacts + Personal Signals",
    role: "Awards, interests, and useful oddities",
    period: "Ongoing",
    type: "Personal",
    signal: "The specific-human layer",
    dialogue:
      "Trophy Hall is the proof that the serious person is still specific: chess, scouting, robotics medals, and a few strange models.",
    details:
      "A curated space for photos, awards, and personal artifacts that add texture without making the first screen messy.",
    highlights: [
      "Eagle Scout.",
      "California kindergarten chess champion.",
      "Algorithmic sports bettor.",
      "Future home for robotics championship photos, project screenshots, and field-note scraps."
    ],
    metrics: ["Eagle Scout", "Chess champion", "sports models"],
    jungleObject: "trophy"
  }
];

export const featuredWork = workItems.slice(0, 4);

export const jungleLocations = [
  { id: "bcg", label: "Strategy", key: "1" },
  { id: "robotics", label: "Robotics", key: "2" },
  { id: "incubator", label: "Incubator", key: "3" },
  { id: "trophy-hall", label: "Trophy Hall", key: "4" }
];
