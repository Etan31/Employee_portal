const sampleData = {
  views: [
    { id: "list", label: "List" },
    { id: "tree", label: "Tree" },
    { id: "org", label: "Org" },
  ],
  variants: [
    {
      id: "standard",
      label: "Standard",
      subtitle: "A compact executive organisation chart.",
    },
    {
      id: "large",
      label: "Large Org",
      subtitle: "A full 20 employee organisation view with departments.",
    },
    {
      id: "department",
      label: "Departments",
      subtitle: "Department-first tree layout for service lines.",
    },
  ],
  standard: {
    tree: [
      {
        key: "1",
        label: "BestRun Corporation",
        children: [
          { key: "1-1", label: "Global Operations" },
          { key: "1-2", label: "Leadership Team Americas" },
          { key: "1-3", label: "Leadership Team EMEA" },
        ],
      },
    ],
    org: [
      {
        key: "1",
        label: "BestRun Corporation",
        data: {
          profile: {
            name: "BestRun Corporation",
            position: "Company",
            email: "",
          },
        },
        children: [
          {
            key: "1-1",
            label: "Global Operations",
            data: {
              profile: {
                name: "Nicole Anderson",
                position: "Executive Assistant",
                email: "nicole@example.com",
              },
            },
            children: [
              {
                key: "1-1-1",
                label: "Ops Lead",
                data: {
                  profile: {
                    name: "Michael Pittman",
                    position: "COO",
                    email: "michael@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-2",
            label: "Leadership Team Americas",
            data: {
              profile: {
                name: "Roberto Benavides",
                position: "President Chile",
                email: "roberto@example.com",
              },
            },
          },
          {
            key: "1-3",
            label: "Leadership Team EMEA",
            data: {
              profile: {
                name: "Laurent Moulet",
                position: "President EMEA",
                email: "laurent@example.com",
              },
            },
          },
        ],
      },
    ],
  },
  large: {
    tree: [
      {
        key: "1",
        label: "BestRun Corporation",
        children: [
          {
            key: "1-1",
            label: "Global Operations",
            children: [
              { key: "1-1-1", label: "Nicole Anderson" },
              { key: "1-1-2", label: "Michael Pittman" },
              { key: "1-1-3", label: "Taylor Reed" },
              { key: "1-1-4", label: "Priya Singh" },
              { key: "1-1-5", label: "Ethan Cruz" },
              { key: "1-1-6", label: "Ava Chen" },
            ],
          },
          {
            key: "1-2",
            label: "Leadership Team Americas",
            children: [
              { key: "1-2-1", label: "Roberto Benavides" },
              { key: "1-2-2", label: "Sofia Park" },
              { key: "1-2-3", label: "Mateo Ruiz" },
              { key: "1-2-4", label: "Lisa Green" },
              { key: "1-2-5", label: "Nadia Khan" },
            ],
          },
          {
            key: "1-3",
            label: "Leadership Team EMEA",
            children: [
              { key: "1-3-1", label: "Laurent Moulet" },
              { key: "1-3-2", label: "Oliver Stone" },
              { key: "1-3-3", label: "Emilia Novak" },
              { key: "1-3-4", label: "Luca Moreau" },
            ],
          },
          {
            key: "1-4",
            label: "Product & Support",
            children: [
              { key: "1-4-1", label: "Jenna Ross" },
              { key: "1-4-2", label: "Chloe Kim" },
              { key: "1-4-3", label: "Sam Ortiz" },
              { key: "1-4-4", label: "Arun Patel" },
            ],
          },
        ],
      },
    ],
    org: [
      {
        key: "1",
        label: "BestRun Corporation",
        data: {
          profile: {
            name: "BestRun Corporation",
            position: "Company",
            email: "",
          },
        },
        children: [
          {
            key: "1-1",
            label: "Global Operations",
            data: {
              profile: {
                name: "Nicole Anderson",
                position: "Executive Assistant",
                email: "nicole@example.com",
              },
            },
            children: [
              {
                key: "1-1-1",
                label: "Michael Pittman",
                data: {
                  profile: {
                    name: "Michael Pittman",
                    position: "COO",
                    email: "michael@example.com",
                  },
                },
              },
              {
                key: "1-1-2",
                label: "Taylor Reed",
                data: {
                  profile: {
                    name: "Taylor Reed",
                    position: "Operations Lead",
                    email: "taylor@example.com",
                  },
                },
              },
              {
                key: "1-1-3",
                label: "Priya Singh",
                data: {
                  profile: {
                    name: "Priya Singh",
                    position: "Logistics Manager",
                    email: "priya@example.com",
                  },
                },
              },
              {
                key: "1-1-4",
                label: "Ethan Cruz",
                data: {
                  profile: {
                    name: "Ethan Cruz",
                    position: "Platform Ops",
                    email: "ethan@example.com",
                  },
                },
              },
              {
                key: "1-1-5",
                label: "Ava Chen",
                data: {
                  profile: {
                    name: "Ava Chen",
                    position: "QA Manager",
                    email: "ava@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-2",
            label: "Leadership Team Americas",
            data: {
              profile: {
                name: "Roberto Benavides",
                position: "President Chile",
                email: "roberto@example.com",
              },
            },
            children: [
              {
                key: "1-2-1",
                label: "Sofia Park",
                data: {
                  profile: {
                    name: "Sofia Park",
                    position: "Regional Strategy",
                    email: "sofia@example.com",
                  },
                },
              },
              {
                key: "1-2-2",
                label: "Mateo Ruiz",
                data: {
                  profile: {
                    name: "Mateo Ruiz",
                    position: "Sales Director",
                    email: "mateo@example.com",
                  },
                },
              },
              {
                key: "1-2-3",
                label: "Lisa Green",
                data: {
                  profile: {
                    name: "Lisa Green",
                    position: "Finance Lead",
                    email: "lisa@example.com",
                  },
                },
              },
              {
                key: "1-2-4",
                label: "Nadia Khan",
                data: {
                  profile: {
                    name: "Nadia Khan",
                    position: "Customer Success",
                    email: "nadia@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-3",
            label: "Leadership Team EMEA",
            data: {
              profile: {
                name: "Laurent Moulet",
                position: "President EMEA",
                email: "laurent@example.com",
              },
            },
            children: [
              {
                key: "1-3-1",
                label: "Oliver Stone",
                data: {
                  profile: {
                    name: "Oliver Stone",
                    position: "Tech Director",
                    email: "oliver@example.com",
                  },
                },
              },
              {
                key: "1-3-2",
                label: "Emilia Novak",
                data: {
                  profile: {
                    name: "Emilia Novak",
                    position: "HR Partner",
                    email: "emilia@example.com",
                  },
                },
              },
              {
                key: "1-3-3",
                label: "Luca Moreau",
                data: {
                  profile: {
                    name: "Luca Moreau",
                    position: "Marketing Lead",
                    email: "luca@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-4",
            label: "Product & Support",
            data: {
              profile: {
                name: "Jenna Ross",
                position: "VP Product",
                email: "jenna@example.com",
              },
            },
            children: [
              {
                key: "1-4-1",
                label: "Chloe Kim",
                data: {
                  profile: {
                    name: "Chloe Kim",
                    position: "Product Manager",
                    email: "chloe@example.com",
                  },
                },
              },
              {
                key: "1-4-2",
                label: "Sam Ortiz",
                data: {
                  profile: {
                    name: "Sam Ortiz",
                    position: "UX Lead",
                    email: "sam@example.com",
                  },
                },
              },
              {
                key: "1-4-3",
                label: "Arun Patel",
                data: {
                  profile: {
                    name: "Arun Patel",
                    position: "Analytics Lead",
                    email: "arun@example.com",
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
  department: {
    tree: [
      {
        key: "1",
        label: "BestRun Corporation",
        children: [
          {
            key: "1-1",
            label: "Global Operations",
            children: [
              { key: "1-1-1", label: "Operations Team" },
              { key: "1-1-2", label: "QA Team" },
            ],
          },
          {
            key: "1-2",
            label: "Leadership Team Americas",
            children: [
              { key: "1-2-1", label: "Sales Team" },
              { key: "1-2-2", label: "Finance Team" },
            ],
          },
          {
            key: "1-3",
            label: "Product & Support",
            children: [
              { key: "1-3-1", label: "Product Team" },
              { key: "1-3-2", label: "Support Team" },
            ],
          },
        ],
      },
    ],
    org: [
      {
        key: "1",
        label: "BestRun Corporation",
        data: {
          profile: {
            name: "BestRun Corporation",
            position: "Company",
            email: "",
          },
        },
        children: [
          {
            key: "1-1",
            label: "Global Operations",
            data: {
              profile: {
                name: "Global Operations",
                position: "Operations",
                email: "",
              },
            },
            children: [
              {
                key: "1-1-1",
                label: "Nicole Anderson",
                data: {
                  profile: {
                    name: "Nicole Anderson",
                    position: "Executive Assistant",
                    email: "nicole@example.com",
                  },
                },
              },
              {
                key: "1-1-2",
                label: "Taylor Reed",
                data: {
                  profile: {
                    name: "Taylor Reed",
                    position: "Operations Lead",
                    email: "taylor@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-2",
            label: "Leadership Team Americas",
            data: {
              profile: {
                name: "Leadership Team Americas",
                position: "Americas",
                email: "",
              },
            },
            children: [
              {
                key: "1-2-1",
                label: "Roberto Benavides",
                data: {
                  profile: {
                    name: "Roberto Benavides",
                    position: "President Chile",
                    email: "roberto@example.com",
                  },
                },
              },
              {
                key: "1-2-2",
                label: "Lisa Green",
                data: {
                  profile: {
                    name: "Lisa Green",
                    position: "Finance Lead",
                    email: "lisa@example.com",
                  },
                },
              },
            ],
          },
          {
            key: "1-3",
            label: "Product & Support",
            data: {
              profile: {
                name: "Product & Support",
                position: "Product & Support",
                email: "",
              },
            },
            children: [
              {
                key: "1-3-1",
                label: "Jenna Ross",
                data: {
                  profile: {
                    name: "Jenna Ross",
                    position: "VP Product",
                    email: "jenna@example.com",
                  },
                },
              },
              {
                key: "1-3-2",
                label: "Arun Patel",
                data: {
                  profile: {
                    name: "Arun Patel",
                    position: "Analytics Lead",
                    email: "arun@example.com",
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
};

export default sampleData;
