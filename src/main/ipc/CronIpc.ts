import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { CronService } from '../services/cron'

/**
 * IPC handlers for cron job management.
 * Uses EventBus to broadcast job results to all renderer windows.
 */
export class CronIpc implements IpcModule {
  readonly name = 'cron'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const cron = container.get<CronService>('cron')

    ipcMain.handle('cron-get-all-jobs', () => cron.getAllJobs())
    ipcMain.handle('cron-get-job', (_e, id: string) => cron.getJob(id))
    ipcMain.handle('cron-start-job', (_e, id: string) => cron.startJob(id))
    ipcMain.handle('cron-stop-job', (_e, id: string) => cron.stopJob(id))
    ipcMain.handle('cron-delete-job', (_e, id: string) => cron.deleteJob(id))
    ipcMain.handle('cron-create-job', (_e, config) => cron.createJob(config))
    ipcMain.handle('cron-update-schedule', (_e, id: string, schedule: string) =>
      cron.updateJobSchedule(id, schedule)
    )
    ipcMain.handle('cron-validate-expression', (_e, expression: string) =>
      cron.validateCronExpression(expression)
    )

    // Replace the single-callback pattern with EventBus broadcast
    cron.onJobResult((result) => {
      eventBus.broadcast('cron-job-result', result)
    })

    cron.initialize()

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
