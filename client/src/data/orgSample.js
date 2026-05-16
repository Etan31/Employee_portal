const sampleData = {
  // Tree structure for Tree view (primereact Tree expects a "key" and "label")
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

  // OrganizationChart structure: each node can have children and an attached data object
  org: [
    {
      label: "BestRun Corporation",
      expanded: true,
      data: {
        profile: {
          name: "BestRun Corporation",
          position: "Company",
          email: "",
        },
      },
      children: [
        {
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
};

export default sampleData;
