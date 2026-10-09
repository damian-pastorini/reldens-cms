/**
 *
 * Reldens - CMS Test Runner
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { RouterContentsTest } = require('./unit/test-router-contents');
const { ContentsBuilderTest } = require('./unit/test-contents-builder');
const { ForwardedHeadersTest } = require('./unit/test-forwarded-headers');
const { PathTraversalTest } = require('./unit/test-path-traversal');
const { RequestDomainEntriesTest } = require('./unit/test-request-domain-entries');
const { PaginationHandlerTest } = require('./unit/test-pagination-handler');
const { EntityAccessManagerTest } = require('./unit/test-entity-access-manager');
const { SearchTest } = require('./unit/test-search');

class RunTests
{

    constructor()
    {
        this.allCounts = {total: 0, passed: 0, failed: 0};
        this.filter = '';
        this.unitTestClasses = [
            RouterContentsTest,
            ContentsBuilderTest,
            ForwardedHeadersTest,
            PathTraversalTest,
            RequestDomainEntriesTest,
            PaginationHandlerTest,
            EntityAccessManagerTest,
            SearchTest
        ];
    }

    parseCommandLineArgs()
    {
        for(let arg of process.argv){
            if(arg.startsWith('--filter=')){
                this.filter = arg.split('=').pop();
                Logger.info('Filter applied: '+this.filter);
            }
        }
    }

    async run()
    {
        Logger.info('='.repeat(60));
        Logger.info('@RELDENS/CMS - TEST SUITE');
        Logger.info('='.repeat(60));
        Logger.info('Test execution started: '+sc.formatDate(new Date()));
        this.parseCommandLineArgs();
        for(let UnitTestClass of this.unitTestClasses){
            if(!UnitTestClass.name.includes(this.filter)){
                continue;
            }
            this.appendCounts(await new UnitTestClass().run());
        }
        Logger.info('='.repeat(60));
        Logger.info('Total tests executed: '+this.allCounts.total);
        Logger.info('Tests passed: '+this.allCounts.passed);
        Logger.info('Tests failed: '+this.allCounts.failed);
        Logger.info('='.repeat(60));
        return this.allCounts;
    }

    appendCounts(result)
    {
        this.allCounts.total += result.total;
        this.allCounts.passed += result.passed;
        this.allCounts.failed += result.failed;
        return this.allCounts;
    }

}

new RunTests().run().then((counts) => {
    process.exit(0 < counts.failed ? 1 : 0);
}).catch((error) => {
    Logger.critical('Test runner failed: '+error.message);
    process.exit(1);
});
