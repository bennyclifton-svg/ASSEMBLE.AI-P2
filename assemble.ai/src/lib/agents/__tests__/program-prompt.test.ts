/**
 * @jest-environment node
 */

import program from '../specialists/program';

describe('Program Agent grounding', () => {
    it('receives profile and project brief objectives in its automatic context', () => {
        expect(program.contextModules).toEqual(expect.arrayContaining(['projectInfo', 'profile']));
    });

    it('automatically requests programme knowledge-domain context', () => {
        expect(program.contextDomainTags).toEqual(
            expect.arrayContaining([
                'programming',
                'milestones',
                'critical-path',
                'construction',
                'regulatory',
            ])
        );
    });

    it('tells the model to use profile and knowledge context before whole-programme creation', () => {
        const prompt = program.buildSystemPrompt({
            assembledContext: '## Project Profile\nResidential apartments in NSW.',
        });

        expect(prompt).toContain('Before creating or replacing a whole programme');
        expect(prompt).toContain('Project Profile / Project Information context');
        expect(prompt).toContain('programme knowledge-library context');
        expect(prompt).toContain('create a programme of multiple activities over a duration');
        expect(prompt).toContain('replace_program once with the complete activity list');
    });
});
