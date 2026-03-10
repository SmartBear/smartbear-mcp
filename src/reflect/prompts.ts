import type { PromptParams } from "../common/types";

export const PROMPTS: PromptParams[] = [
  {
    name: "reflect-sap-test",
    params: {
      title: "Reflect SAP Test",
      description:
        "Guidelines for creating a Reflect test against an SAP S4/HANA or SAP BTP application.",
      argsSchema: {},
    },
    callback: (): object => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `When creating an SAP test:
        1. Always precede an input step with a click step.
        2. Always capture a screenshot after each step, even form field actions.
        3. If text is ellipsized with a hyphen, do not include the hyphen in your prompt step.
        4. If you navigate to the wrong page, use browser navigation (e.g. "Click the back button") or on-screen navigation to get to the prior screen. Make sure to delete the original step and any steps you added to navigate back to the previous screen so that the test is repeatable and contains no unnecessary steps.
        5. When applicable, use the prompt "Press the tab key" to tab through fields and the prompt "Press the enter key" to submit a form.
        6. When building tests from BPD docs, if the input value for the next step is based on an example value in the doc, prompt the user to ask for their desired value. Provide the example value in your prompt so the user has additional context.`,
          },
        },
      ],
    }),
  },
];
