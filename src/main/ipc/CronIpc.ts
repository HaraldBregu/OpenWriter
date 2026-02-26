import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { CronService } from '../services/cron'
import { wrapSimpleHandler } from './IpcErrorHandler'
import { CronChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for cron job management.
 * Uses EventBus to broadcast job results to all renderer windows.
 */
export class CronIpc implements IpcModule {
  readonly name = 'cron'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const cron = container.get<CronService>('cron')

    ipcMain.handle(
      CronChannels.getAll,
      wrapSimpleHandler(() => cron.getAllJobs(), CronChannels.getAll)
    )
    ipcMain.handle(
      CronChannels.getJob,
      wrapSimpleHandler((id: string) => cron.getJob(id), CronChannels.getJob)
    )
    ipcMain.handle(
      CronChannels.start,
      wrapSimpleHandler((id: string) => cron.startJob(id), CronChannels.start)
    )
    ipcMain.handle(
      CronChannels.stop,
      wrapSimpleHandler((id: string) => cron.stopJob(id), CronChannels.stop)
    )
    ipcMain.handle(
      CronChannels.delete,
      wrapSimpleHandler((id: string) => cron.deleteJob(id), CronChannels.delete)
    )
    ipcMain.handle(
      CronChannels.create,
      wrapSimpleHandler((config) => cron.createJob(config), CronChannels.create)
    )
    ipcMain.handle(
      CronChannels.updateSchedule,
      wrapSimpleHandler(
        (id: string, schedule: string) => cron.updateJobSchedule(id, schedule),
        CronChannels.updateSchedule
      )
    )
    ipcMain.handle(
      CronChannels.validateExpression,
      wrapSimpleHandler(
        (expression: string) => cron.validateCronExpression(expression),
        CronChannels.validateExpression
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
