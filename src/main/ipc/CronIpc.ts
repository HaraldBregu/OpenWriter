import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { CronService } from '../services/cron'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for cron job management.
 * Uses EventBus to broadcast job results to all renderer windows.
 */
export class CronIpc implements IpcModule {
  readonly name = 'cron'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const cron = container.get<CronService>('cron')

    ipcMain.handle(
      'cron-get-all-jobs',
      wrapSimpleHandler(() => cron.getAllJobs(), 'cron-get-all-jobs')
    )
    ipcMain.handle(
      'cron-get-job',
      wrapSimpleHandler((id: string) => cron.getJob(id), 'cron-get-job')
    )
    ipcMain.handle(
      'cron-start-job',
      wrapSimpleHandler((id: string) => cron.startJob(id), 'cron-start-job')
    )
    ipcMain.handle(
      'cron-stop-job',
      wrapSimpleHandler((id: string) => cron.stopJob(id), 'cron-stop-job')
    )
    ipcMain.handle(
      'cron-delete-job',
      wrapSimpleHandler((id: string) => cron.deleteJob(id), 'cron-delete-job')
    )
    ipcMain.handle(
      'cron-create-job',
      wrapSimpleHandler((config) => cron.createJob(config), 'cron-create-job')
    )
    ipcMain.handle(
      'cron-update-schedule',
      wrapSimpleHandler(
        (id: string, schedule: string) => cron.updateJobSchedule(id, schedule),
        'cron-update-schedule'
      )
    )
    ipcMain.handle(
      'cron-validate-expression',
      wrapSimpleHandler(
        (expression: string) => cron.validateCronExpression(expression),
        'cron-validate-expression'
      )
    )

    // Replace the single-callback pattern with EventBus broadcast
    cron.onJobResult((result) => {
      eventBus.broadcast('cron-job-result', result)
    })

    cron.initialize()

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
